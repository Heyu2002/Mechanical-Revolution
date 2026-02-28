import type {
  AgentConfig,
  AgentContext,
  FrameworkConfig,
  Message,
  ProviderToolSchema,
  RunnerEvent,
  RunResult,
} from "../../types.js";
import { resolveInstructions } from "../agent/agent.js";
import { toolToSchema, executeTool } from "../tool/tool.js";
import { handoffsToTools, isHandoffTool } from "../tool/handoff.js";
import { runGuardrails } from "../guardrail/guardrail.js";
import { createContext } from "./context.js";
import { Tracer, formatTrace } from "../../observability/tracing.js";
import { TaskFlowTracker } from "../../observability/task-flow.js";
import { providerRegistry } from "../../providers/registry.js";
import { logger } from "../../utils/logger.js";

/**
 * Runner — the agentic loop execution engine.
 *
 * Now with A2A-inspired TaskFlow tracking:
 * - Each agent execution is a Task with a lifecycle (submitted → working → completed/handoff/failed)
 * - Handoffs create child tasks, forming a flow chain
 * - Every event carries taskId for precise flow tracking
 * - The currently executing agent is always the one with an active (working) task
 */
export class Runner {
  private config: FrameworkConfig;
  private agentMap: Map<string, AgentConfig>;

  constructor(config: FrameworkConfig, agents?: AgentConfig[]) {
    this.config = config;
    this.agentMap = new Map();
    if (agents) {
      for (const agent of agents) {
        this.agentMap.set(agent.name, agent);
      }
    }
  }

  registerAgents(agents: AgentConfig[]): void {
    for (const agent of agents) {
      this.agentMap.set(agent.name, agent);
    }
  }

  async run(
    agent: AgentConfig,
    input: string,
    context?: Partial<AgentContext>
  ): Promise<RunResult> {
    const events: RunnerEvent[] = [];
    for await (const event of this.runStream(agent, input, context)) {
      events.push(event);
    }

    const completedEvent = events.find(
      (e): e is Extract<RunnerEvent, { type: "task_completed" }> =>
        e.type === "task_completed"
    );
    const failedEvent = events.find(
      (e): e is Extract<RunnerEvent, { type: "task_failed" }> =>
        e.type === "task_failed"
    );
    const flowEvent = events.find(
      (e): e is Extract<RunnerEvent, { type: "flow_complete" }> =>
        e.type === "flow_complete"
    );

    if (failedEvent) {
      throw new Error(failedEvent.error);
    }

    return {
      output: completedEvent?.output ?? "",
      context: (context as AgentContext) ?? createContext(),
      trace: { id: "", spans: [], startTime: Date.now() },
      flow: flowEvent?.flow ?? { contextId: "", tasks: [], startTime: Date.now() },
      lastAgent: completedEvent?.agent ?? agent.name,
    };
  }

  /**
   * Core agentic loop with TaskFlow tracking.
   */
  async *runStream(
    agent: AgentConfig,
    input: string,
    partialCtx?: Partial<AgentContext>,
    _flowTracker?: TaskFlowTracker,
    _parentTaskId?: string
  ): AsyncGenerator<RunnerEvent> {
    if (!this.agentMap.has(agent.name)) {
      this.agentMap.set(agent.name, agent);
    }

    const ctx = partialCtx?.state
      ? (partialCtx as AgentContext)
      : createContext(partialCtx);

    ctx.currentAgent = agent.name;
    if (!ctx.handoffChain.includes(agent.name)) {
      ctx.handoffChain.push(agent.name);
    }

    // ── Resolve provider ──
    const { providerName, providerConfig, provider, model } =
      this.resolveProvider(agent);

    // ── TaskFlow: create or continue ──
    const isRoot = !_flowTracker;
    const flowTracker = _flowTracker ?? new TaskFlowTracker();

    let task;
    if (_parentTaskId) {
      // This is a handoff — child task was already created by parent
      task = flowTracker.activeTask!;
    } else {
      // Root task
      task = flowTracker.createTask({
        targetAgent: agent.name,
        provider: providerName,
        model,
        input,
      });
    }

    const taskId = task.taskId;

    // ── Emit: task submitted ──
    yield {
      type: "task_submitted",
      taskId,
      contextId: flowTracker.contextId,
      agent: agent.name,
      provider: providerName,
      model,
      input,
    };

    // ── Transition: working ──
    flowTracker.transition(taskId, "working");
    yield { type: "task_working", taskId, agent: agent.name };

    const tracer = new Tracer();
    const agentSpanId = tracer.startSpan(agent.name, "agent", { input });

    const history: Message[] = [...ctx.history];
    if (input) {
      history.push({ role: "user", content: input });
    }

    const maxTurns = agent.maxTurns ?? 10;
    let turn = 0;

    try {
      while (turn < maxTurns) {
        turn++;

        // ── Input Guardrails ──
        const inputGuardrails = (agent.guardrails ?? []).filter(
          (g) => g.type === "input"
        );
        if (inputGuardrails.length > 0 && input) {
          const guardSpanId = tracer.startSpan("input_guardrails", "guardrail");
          const guardResult = await runGuardrails(inputGuardrails, input, ctx);
          tracer.endSpan(guardSpanId, guardResult);

          if (!guardResult.passed) {
            const blocked = guardResult.results.find(
              (r) => !r.passed && r.action === "block"
            );
            yield {
              type: "guardrail_triggered",
              taskId,
              guardrail: blocked?.name ?? "unknown",
              result: blocked ?? { passed: false, action: "block" },
            };
            const output = `Blocked by guardrail: ${blocked?.message ?? "input validation failed"}`;
            flowTracker.fail(taskId, output);
            yield { type: "task_failed", taskId, agent: agent.name, error: output };
            tracer.endSpan(agentSpanId, { output });
            if (isRoot) yield { type: "flow_complete", flow: flowTracker.getFlow() };
            return;
          }
        }

        // ── Build Request ──
        const systemPrompt = resolveInstructions(agent, ctx);
        const messages: Message[] = [
          { role: "system", content: systemPrompt },
          ...history,
        ];

        const toolSchemas: ProviderToolSchema[] = (agent.tools ?? []).map(
          toolToSchema
        );
        const handoffData = handoffsToTools(agent.handoffs ?? []);
        const allTools = [...toolSchemas, ...handoffData.schemas];

        // ── LLM Call ──
        yield {
          type: "llm_call",
          taskId,
          agent: agent.name,
          provider: providerName,
          model,
          turn,
        };

        const llmSpanId = tracer.startSpan(`${providerName}/${model}`, "llm", {
          messageCount: messages.length,
          toolCount: allTools.length,
        });

        const response = await provider.complete({
          model,
          messages,
          tools: allTools.length > 0 ? allTools : undefined,
          temperature: agent.temperature,
          topP: agent.topP,
        });

        tracer.endSpan(llmSpanId, {
          finishReason: response.finishReason,
          usage: response.usage,
        });

        yield { type: "llm_response", taskId, response };

        // ── Handle Tool Calls ──
        if (response.toolCalls && response.toolCalls.length > 0) {
          history.push({
            role: "assistant",
            content: response.content,
            toolCalls: response.toolCalls,
          });

          for (const toolCall of response.toolCalls) {
            // ── Handoff ──
            if (isHandoffTool(toolCall.name)) {
              const handoffResult = handoffData.resolve(
                toolCall.name,
                ctx,
                history
              );
              if (handoffResult) {
                const targetAgent = this.resolveAgent(
                  handoffResult.targetAgent
                );
                const targetProvider = this.resolveProvider(targetAgent);

                let reason: string | undefined;
                try {
                  const args = JSON.parse(toolCall.arguments);
                  reason = args.reason;
                } catch {}

                // Create child task via flow tracker
                const childTask = flowTracker.handoff(
                  taskId,
                  handoffResult.targetAgent,
                  targetProvider.providerName,
                  targetProvider.model,
                  reason
                );

                const handoffSpanId = tracer.startSpan(
                  `handoff → ${handoffResult.targetAgent}`,
                  "handoff"
                );

                yield {
                  type: "task_handoff",
                  taskId,
                  fromAgent: agent.name,
                  toAgent: handoffResult.targetAgent,
                  reason,
                  newTaskId: childTask.taskId,
                  toProvider: targetProvider.providerName,
                  toModel: targetProvider.model,
                };

                logger.info(
                  `Handoff: ${agent.name} → ${handoffResult.targetAgent} [${taskId} → ${childTask.taskId}]`
                );

                const newCtx = handoffResult.context;
                newCtx.history = handoffResult.history;

                tracer.endSpan(handoffSpanId);
                tracer.endSpan(agentSpanId, {
                  handoffTo: handoffResult.targetAgent,
                });

                // Recursive — pass the flow tracker so child tasks are tracked
                yield* this.runStream(
                  targetAgent,
                  "",
                  newCtx,
                  flowTracker,
                  taskId
                );
                return;
              }
            }

            // ── Regular Tool ──
            flowTracker.addToolCall(taskId, toolCall.name, toolCall.arguments);

            yield {
              type: "tool_call",
              taskId,
              agent: agent.name,
              toolName: toolCall.name,
              args: toolCall.arguments,
            };

            const tool = (agent.tools ?? []).find(
              (t) => t.name === toolCall.name
            );
            if (!tool) {
              const errorResult = JSON.stringify({
                error: `Unknown tool: ${toolCall.name}`,
              });
              history.push({
                role: "tool",
                content: errorResult,
                toolCallId: toolCall.id,
                name: toolCall.name,
              });
              flowTracker.addToolResult(taskId, toolCall.name, errorResult);
              yield {
                type: "tool_result",
                taskId,
                agent: agent.name,
                toolName: toolCall.name,
                result: errorResult,
              };
              continue;
            }

            const toolSpanId = tracer.startSpan(toolCall.name, "tool", {
              args: toolCall.arguments,
            });

            const result = await executeTool(tool, toolCall.arguments, ctx);
            tracer.endSpan(toolSpanId, { result });

            flowTracker.addToolResult(taskId, toolCall.name, result);

            history.push({
              role: "tool",
              content: result,
              toolCallId: toolCall.id,
              name: toolCall.name,
            });

            yield {
              type: "tool_result",
              taskId,
              agent: agent.name,
              toolName: toolCall.name,
              result,
            };
          }

          continue;
        }

        // ── Text Response ──
        const output = response.content;

        if (output) {
          yield { type: "text_delta", taskId, content: output };
        }

        // Output guardrails
        const outputGuardrails = (agent.guardrails ?? []).filter(
          (g) => g.type === "output"
        );
        if (outputGuardrails.length > 0 && output) {
          const guardSpanId = tracer.startSpan("output_guardrails", "guardrail");
          const guardResult = await runGuardrails(outputGuardrails, output, ctx);
          tracer.endSpan(guardSpanId, guardResult);

          if (!guardResult.passed) {
            const blocked = guardResult.results.find(
              (r) => !r.passed && r.action === "block"
            );
            yield {
              type: "guardrail_triggered",
              taskId,
              guardrail: blocked?.name ?? "unknown",
              result: blocked ?? { passed: false, action: "block" },
            };
          }

          for (const r of guardResult.results) {
            if (!r.passed && r.action === "warn") {
              logger.warn(`Guardrail warning [${r.name}]: ${r.message}`);
            }
          }
        }

        history.push({ role: "assistant", content: output });
        ctx.history = history;

        // ── Task completed ──
        flowTracker.complete(taskId, output);
        tracer.endSpan(agentSpanId, { output });

        yield { type: "task_completed", taskId, agent: agent.name, output };

        // Emit flow_complete only from root
        if (isRoot) {
          if (this.config.tracing?.enabled) {
            const trace = tracer.getTrace();
            logger.debug(formatTrace(trace));
          }
          yield { type: "flow_complete", flow: flowTracker.getFlow() };
        }

        return;
      }

      // Max turns exceeded
      const output = `[Max turns (${maxTurns}) exceeded]`;
      ctx.history = history;
      flowTracker.fail(taskId, output);
      tracer.endSpan(agentSpanId, { output, maxTurnsExceeded: true });
      yield { type: "task_failed", taskId, agent: agent.name, error: output };
      if (isRoot) yield { type: "flow_complete", flow: flowTracker.getFlow() };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      flowTracker.fail(taskId, error.message);
      tracer.endSpan(agentSpanId, undefined, error.message);
      yield { type: "task_failed", taskId, agent: agent.name, error: error.message };
      if (isRoot) yield { type: "flow_complete", flow: flowTracker.getFlow() };
    }
  }

  private resolveProvider(agent: AgentConfig) {
    const providerName = agent.provider ?? this.config.defaultProvider;
    if (!providerName) {
      throw new Error(
        `Agent "${agent.name}" has no provider specified and no defaultProvider in config.`
      );
    }

    const providerConfig = this.config.providers[providerName];
    if (!providerConfig) {
      throw new Error(
        `Provider "${providerName}" (for agent "${agent.name}") not found in config. ` +
          `Available: ${Object.keys(this.config.providers).join(", ")}`
      );
    }

    const provider = providerRegistry.get(providerName, providerConfig);
    const model = agent.model ?? providerConfig.model;
    if (!model) {
      throw new Error(
        `No model specified for agent "${agent.name}" and provider "${providerName}" has no default model.`
      );
    }

    return { providerName, providerConfig, provider, model };
  }

  private resolveAgent(name: string): AgentConfig {
    const agent = this.agentMap.get(name);
    if (!agent) {
      throw new Error(
        `Agent "${name}" not found. ` +
          `Available: ${[...this.agentMap.keys()].join(", ")}. ` +
          `Register agents with runner.registerAgents().`
      );
    }
    return agent;
  }
}
