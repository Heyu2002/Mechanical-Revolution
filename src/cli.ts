#!/usr/bin/env node

import { loadConfig, getProviderConfig } from "./config/config.js";
import { Runner } from "./core/runner/runner.js";
import { registerBuiltinProviders } from "./providers/index.js";
import { defineAgent } from "./core/agent/agent.js";
import { createContext } from "./core/runner/context.js";
import { InteractivePrompt } from "./cli/autocomplete.js";
import type { CommandItem } from "./cli/autocomplete.js";
import { DEFAULT_SYSTEM_PROMPT } from "./core/prompt-loader.js";
import type { AgentConfig, AgentContext, FrameworkConfig, RunnerEvent, TaskFlow } from "./types.js";
import { AgentRegistry } from "./core/agent/registry.js";
import { createChatDetector } from "./routing/chat-detector.js";
import { createAIRouter } from "./routing/ai-router.js";
import { SkillLoader } from "./skills/loader.js";
import * as path from "path";

// ─── Slash Commands ───

const SLASH_COMMANDS: CommandItem[] = [
  { name: "/help",     description: "Show detailed help" },
  { name: "/provider", description: "Switch LLM provider", hasArgs: true },
  { name: "/agents",   description: "List registered agents" },
  { name: "/agent",    description: "Switch active agent", hasArgs: true },
  { name: "/clear",    description: "Clear conversation history" },
  { name: "/verbose",  description: "Toggle verbose mode" },
  { name: "/skills",   description: "List all available skills" },
  { name: "/skill",    description: "Show skill details", hasArgs: true },
  { name: "/quit",     description: "Exit" },
];

// ─── Colors ───

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  red: "\x1b[31m",
  blue: "\x1b[34m",
  white: "\x1b[37m",
  bgCyan: "\x1b[46m\x1b[30m",
  bgGreen: "\x1b[42m\x1b[30m",
};

// ─── Provider Display Names ───

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  anthropic: "claude",
  openai: "openai",
  doubao: "doubao",
  qwen: "qwen",
  deepseek: "deepseek",
  ollama: "ollama",
};

function resolveProviderName(input: string, available: string[]): string | undefined {
  if (available.includes(input)) return input;
  for (const [configKey, displayName] of Object.entries(PROVIDER_DISPLAY_NAMES)) {
    if (displayName === input && available.includes(configKey)) return configKey;
  }
  const lower = input.toLowerCase();
  for (const key of available) {
    const display = PROVIDER_DISPLAY_NAMES[key] ?? key;
    if (display.toLowerCase() === lower || key.toLowerCase() === lower) return key;
  }
  return undefined;
}

function getDisplayName(configKey: string): string {
  return PROVIDER_DISPLAY_NAMES[configKey] ?? configKey;
}

// ─── Banner & Help ───

function printBanner(): void {
  console.log(`
${C.cyan}${C.bold}  ╔══════════════════════════════════════╗
  ║     Mechanical Revolution  v0.1.0    ║
  ║       Multi-Agent CLI Framework      ║
  ╚══════════════════════════════════════╝${C.reset}
`);
}

function printHelp(): void {
  console.log(`
${C.bold}Commands:${C.reset}

  ${C.cyan}/provider${C.reset}            List available providers
  ${C.cyan}/provider <name>${C.reset}     Switch to a provider (e.g. /provider claude)
  ${C.cyan}/agents${C.reset}              List registered agents
  ${C.cyan}/agent <name>${C.reset}        Switch active agent
  ${C.cyan}/clear${C.reset}               Clear conversation history
  ${C.cyan}/verbose${C.reset}             Toggle verbose mode (show LLM calls, tool results)
  ${C.cyan}/skills${C.reset}              List all available skills
  ${C.cyan}/skill <name>${C.reset}        Show skill details
  ${C.cyan}/help${C.reset}                Show this help
  ${C.cyan}/quit${C.reset}                Exit

${C.bold}Provider names:${C.reset}
  claude = Anthropic Claude    openai = OpenAI GPT
  doubao = ByteDance Doubao    qwen = Alibaba Qwen
  deepseek = DeepSeek          ollama = Local Ollama
`);
}

// ─── Task Flow Renderer ───

class FlowRenderer {
  private verbose = false;
  private flowSteps: string[] = [];
  private currentAgent = "";
  private textStarted = false;

  setVerbose(v: boolean) { this.verbose = v; }
  isVerbose() { return this.verbose; }

  taskSubmitted(taskId: string, agent: string, provider: string, model: string, _input: string): void {
    this.currentAgent = agent;
    this.textStarted = false;
    const step = this.flowSteps.length + 1;
    const display = getDisplayName(provider);
    console.log(
      `\n${C.bgCyan} STEP ${step} ${C.reset} ` +
      `${C.cyan}${C.bold}${agent}${C.reset} ` +
      `${C.dim}(${display}/${model})${C.reset} ` +
      `${C.dim}[task:${taskId}]${C.reset}`
    );
    this.flowSteps.push(agent);
  }

  taskWorking(_taskId: string, agent: string): void {
    console.log(`  ${C.dim}⏳ ${agent} is working...${C.reset}`);
  }

  llmCall(agent: string, provider: string, model: string, turn: number): void {
    if (this.verbose) {
      const display = getDisplayName(provider);
      console.log(`  ${C.dim}🧠 LLM call #${turn} → ${display}/${model}${C.reset}`);
    }
  }

  toolCall(agent: string, toolName: string, args: unknown): void {
    console.log(`  ${C.yellow}🔧 ${agent}${C.reset} ${C.dim}→${C.reset} ${C.yellow}${toolName}${C.reset}`);
    if (this.verbose) {
      const preview = typeof args === "string" ? args.slice(0, 100) : JSON.stringify(args).slice(0, 100);
      console.log(`     ${C.dim}args: ${preview}${C.reset}`);
    }
  }

  toolResult(_agent: string, _toolName: string, result: unknown): void {
    if (this.verbose) {
      const preview = typeof result === "string" ? result.slice(0, 120) : JSON.stringify(result).slice(0, 120);
      console.log(`     ${C.dim}result: ${preview}${C.reset}`);
    }
  }

  taskHandoff(
    fromAgent: string, toAgent: string, reason: string | undefined,
    newTaskId: string, toProvider: string, toModel: string
  ): void {
    const display = getDisplayName(toProvider);
    const reasonStr = reason ? ` ${C.dim}"${reason}"${C.reset}` : "";

    // Display explicit transfer message
    console.log(
      `\n  ${C.yellow}${C.bold}📤 The task was transferred from ${C.cyan}${fromAgent}${C.reset}${C.yellow}${C.bold} to ${C.cyan}${toAgent}${C.reset}${C.yellow}${C.bold}.${C.reset}`
    );

    console.log(
      `  ${C.magenta}${C.bold}🔀 HANDOFF${C.reset} ` +
      `${C.cyan}${fromAgent}${C.reset} → ${C.cyan}${C.bold}${toAgent}${C.reset}` +
      reasonStr
    );
    console.log(
      `  ${C.dim}   target: ${display}/${toModel} [task:${newTaskId}]${C.reset}`
    );
  }

  textDelta(content: string): void {
    if (!this.textStarted) {
      process.stdout.write(`\n  ${C.green}💬 ${this.currentAgent}:${C.reset} `);
      this.textStarted = true;
    }
    process.stdout.write(content);
  }

  taskCompleted(taskId: string, agent: string): void {
    if (this.textStarted) { console.log(); this.textStarted = false; }
    console.log(`  ${C.green}✅ ${agent} completed${C.reset} ${C.dim}[task:${taskId}]${C.reset}`);
  }

  taskFailed(taskId: string, agent: string, error: string): void {
    if (this.textStarted) { console.log(); this.textStarted = false; }
    console.log(`  ${C.red}❌ ${agent} failed: ${error}${C.reset} ${C.dim}[task:${taskId}]${C.reset}`);
  }

  guardrailTriggered(name: string, message?: string): void {
    console.log(`  ${C.yellow}🛡️ Guardrail [${name}]: ${message ?? "triggered"}${C.reset}`);
  }

  flowComplete(flow: TaskFlow): void {
    console.log(`\n${C.dim}${"─".repeat(50)}${C.reset}`);
    console.log(`${C.bold}📊 Task Flow Summary${C.reset} ${C.dim}[context:${flow.contextId.slice(0, 8)}]${C.reset}`);

    for (let i = 0; i < flow.tasks.length; i++) {
      const task = flow.tasks[i];
      const isLast = i === flow.tasks.length - 1;
      const connector = isLast ? "└" : "├";
      const pipe = isLast ? " " : "│";
      const stateIcon = this.stateIcon(task.currentState);
      const duration = task.endTime ? `${task.endTime - task.startTime}ms` : "...";
      const display = getDisplayName(task.provider);

      console.log(
        `  ${connector}─ ${stateIcon} ${C.cyan}${C.bold}${task.targetAgent}${C.reset} ` +
        `${C.dim}(${display}/${task.model})${C.reset} ` +
        `${C.dim}${duration}${C.reset}`
      );

      if (task.sourceAgent) {
        console.log(`  ${pipe}  ${C.dim}← from ${task.sourceAgent}${C.reset}`);
      }
      for (const tc of task.toolCalls) {
        console.log(`  ${pipe}  ${C.dim}🔧 ${tc.toolName}${C.reset}`);
      }
      if (task.childTaskId && !isLast) {
        const reason = task.statusHistory.find((s) => s.state === "handoff")?.message;
        const reasonStr = reason ? ` (${reason})` : "";
        console.log(`  ${pipe}  ${C.magenta}↓ handoff${reasonStr}${C.reset}`);
      }
    }

    const totalMs = (flow.endTime ?? Date.now()) - flow.startTime;
    console.log(`\n  ${C.dim}Total: ${totalMs}ms | Tasks: ${flow.tasks.length}${C.reset}`);
    console.log(`${C.dim}${"─".repeat(50)}${C.reset}\n`);
  }

  private stateIcon(state: string): string {
    switch (state) {
      case "completed": return `${C.green}✅${C.reset}`;
      case "failed": return `${C.red}❌${C.reset}`;
      case "canceled": return `${C.dim}🚫${C.reset}`;
      case "handoff": return `${C.magenta}🔀${C.reset}`;
      case "working": return `${C.yellow}⏳${C.reset}`;
      default: return `${C.dim}○${C.reset}`;
    }
  }

  reset(): void {
    this.flowSteps = [];
    this.currentAgent = "";
    this.textStarted = false;
  }
}

// ─── Main ───

async function main(): Promise<void> {
  printBanner();

  let config: FrameworkConfig;
  try {
    config = loadConfig();
  } catch (err) {
    console.error(
      `${C.red}Failed to load config: ${err instanceof Error ? err.message : err}${C.reset}`
    );
    console.error(
      `${C.dim}Copy config/config.example.json to config/config.json and fill in your keys.${C.reset}`
    );
    process.exit(1);
  }

  registerBuiltinProviders();

  // ─── Load project agents ───
  console.log(`${C.dim}Loading project agents...${C.reset}`);
  const registry = new AgentRegistry({
    projectAgentsDir: path.join(process.cwd(), ".agents"),
    enableHotReload: false,
  });

  try {
    await registry.loadAll();
    const projectAgents = registry.list();
    if (projectAgents.length > 0) {
      console.log(`${C.green}✓${C.reset} ${C.dim}Loaded ${projectAgents.length} project agents${C.reset}`);
      for (const agent of projectAgents) {
        console.log(`  ${C.cyan}${agent.name}${C.reset} ${C.dim}- ${agent.capabilities?.summary || "No description"}${C.reset}`);
      }
    } else {
      console.log(`${C.dim}No project agents found in .agents/${C.reset}`);
    }
  } catch (err) {
    console.log(`${C.yellow}⚠${C.reset} ${C.dim}Could not load project agents: ${err instanceof Error ? err.message : err}${C.reset}`);
  }

  const providerNames = Object.keys(config.providers);
  console.log(`${C.dim}Available providers:${C.reset}`);
  for (const name of providerNames) {
    const pc = config.providers[name];
    const display = getDisplayName(name);
    const toolIcon = pc.nativeToolCall ? "✅" : "❌";
    console.log(
      `  ${C.cyan}${display}${C.reset} ${C.dim}model=${pc.model} toolCall=${toolIcon}${C.reset}`
    );
  }

  // Default assistant
  const defaultProviderName = config.defaultProvider && config.providers[config.defaultProvider]
    ? config.defaultProvider
    : providerNames[0];
  const defaultProviderConfig = config.providers[defaultProviderName];

  const defaultAgent = defineAgent({
    name: "assistant",
    instructions: DEFAULT_SYSTEM_PROMPT,
    provider: defaultProviderName,
    model: defaultProviderConfig.model,
  });

  const agents: AgentConfig[] = [defaultAgent];

  // Add project agents to the list
  const projectAgents = registry.list();
  for (const agent of projectAgents) {
    agents.push(agent);
  }

  let activeAgent = defaultAgent;
  const ctx = createContext();
  const flowRenderer = new FlowRenderer();
  const runner = new Runner(config, agents);

  // ─── Initialize AI-driven routing ───
  const chatDetector = createChatDetector();

  // 优先使用 Claude 进行任务路由（推理能力更强）
  let routerProviderName = defaultProviderName;
  let routerProviderConfig = defaultProviderConfig;

  if (config.providers["anthropic"]) {
    routerProviderName = "anthropic";
    routerProviderConfig = config.providers["anthropic"];
    if (flowRenderer.isVerbose()) {
      console.log(`${C.dim}Using Claude for task routing${C.reset}`);
    }
  } else if (config.providers["openai"]) {
    routerProviderName = "openai";
    routerProviderConfig = config.providers["openai"];
    if (flowRenderer.isVerbose()) {
      console.log(`${C.dim}Using OpenAI for task routing${C.reset}`);
    }
  }

  const aiRouter = projectAgents.length > 0
    ? createAIRouter(projectAgents, routerProviderName, routerProviderConfig)
    : null;

  if (aiRouter) {
    const routerDisplay = getDisplayName(routerProviderName);
    console.log(`${C.green}✓${C.reset} ${C.dim}AI-driven routing enabled (using ${routerDisplay})${C.reset}\n`);
  }

  // ─── Initialize skill loader ───
  const skillLoader = new SkillLoader(path.join(process.cwd(), ".skills"));
  skillLoader.loadAll();

  // ─── Interactive prompt with autocomplete ───
  const prompt = new InteractivePrompt(SLASH_COMMANDS);

  // Set initial agent display (show provider name instead of generic "assistant")
  const initialDisplay = `${getDisplayName(activeAgent.provider)}`;
  prompt.setCurrentAgent(initialDisplay);

  const printActive = () => {
    const display = getDisplayName(activeAgent.provider);
    console.log(
      `${C.dim}Active: ${C.cyan}${activeAgent.name}${C.reset}${C.dim} (${display}/${activeAgent.model})${C.reset}`
    );
  };

  console.log();
  printActive();
  console.log(`${C.dim}Type ${C.cyan}/${C.reset}${C.dim} for commands.${C.reset}\n`);

  // ─── REPL loop ───
  while (true) {
    const result = await prompt.ask();

    if (result.type === "eof") {
      console.log(`${C.dim}Goodbye!${C.reset}`);
      break;
    }

    const trimmed = result.value.trim();
    if (!trimmed) continue;

    // Slash command
    if (trimmed.startsWith("/")) {
      const shouldExit = handleCommand(trimmed);
      if (shouldExit) break;
      continue;
    }

    // Regular input → send to LLM
    try {
      flowRenderer.reset();
      // Need to temporarily exit raw mode for streaming output
      if (process.stdin.isRaw) process.stdin.setRawMode(false);

      // ─── AI-driven routing: detect chat and route tasks ───
      let targetAgent = activeAgent;

      if (aiRouter && projectAgents.length > 0) {
        // Step 1: Check if it's simple chat
        const chatResult = chatDetector.detect(trimmed);

        if (flowRenderer.isVerbose()) {
          console.log(`${C.dim}[Routing] Is simple chat: ${chatResult.isSimpleChat} (confidence: ${(chatResult.confidence * 100).toFixed(1)}%)${C.reset}`);
          console.log(`${C.dim}[Routing] Reasoning: ${chatResult.reasoning}${C.reset}\n`);
        }

        // Step 2: If not simple chat, use AI to route
        if (!chatResult.isSimpleChat) {
          console.log(`${C.dim}⏳ Analyzing task and selecting best agent...${C.reset}\n`);

          try {
            const routingDecision = await aiRouter.route(trimmed);

            if (flowRenderer.isVerbose()) {
              console.log(`${C.dim}[Routing] AI Decision:${C.reset}`);
              console.log(`${C.dim}  - Target: ${routingDecision.targetAgent}${C.reset}`);
              console.log(`${C.dim}  - Task type: ${routingDecision.taskType}${C.reset}`);
              console.log(`${C.dim}  - Confidence: ${(routingDecision.confidence * 100).toFixed(1)}%${C.reset}`);
              console.log(`${C.dim}  - Reasoning: ${routingDecision.reasoning}${C.reset}\n`);
            }

            // Find the target agent
            const selectedAgent = projectAgents.find(a => a.name === routingDecision.targetAgent);

            if (selectedAgent && selectedAgent.name !== activeAgent.name) {
              targetAgent = selectedAgent;
              activeAgent = targetAgent;

              const displayName = targetAgent.name === "assistant"
                ? getDisplayName(targetAgent.provider)
                : targetAgent.name;
              prompt.setCurrentAgent(displayName);

              console.log(
                `${C.yellow}🔀 Routing to ${C.cyan}${targetAgent.name}${C.reset} ${C.dim}(${routingDecision.reasoning})${C.reset}\n`
              );
            }
          } catch (error) {
            console.error(`${C.yellow}⚠ AI routing failed: ${error instanceof Error ? error.message : error}${C.reset}`);
            console.log(`${C.dim}Using current agent: ${activeAgent.name}${C.reset}\n`);
          }
        } else {
          // Simple chat - use current agent
          if (flowRenderer.isVerbose()) {
            console.log(`${C.dim}[Routing] Simple chat detected, using current agent${C.reset}\n`);
          }
        }
      }

      for await (const event of runner.runStream(targetAgent, trimmed, ctx)) {
        renderEvent(event);
      }

    } catch (err) {
      console.error(`\n${C.red}Error: ${err instanceof Error ? err.message : err}${C.reset}\n`);
    }
  }

  prompt.destroy();
  process.exit(0);

  // ─── Event renderer ───

  function renderEvent(event: RunnerEvent): void {
    switch (event.type) {
      case "task_submitted":
        flowRenderer.taskSubmitted(event.taskId, event.agent, event.provider, event.model, event.input);
        // Update prompt display when agent changes
        // Show agent name for custom agents, provider name for default "assistant"
        const displayName = event.agent === "assistant"
          ? getDisplayName(event.provider)
          : event.agent;
        prompt.setCurrentAgent(displayName);
        break;
      case "task_working":
        flowRenderer.taskWorking(event.taskId, event.agent);
        break;
      case "llm_call":
        flowRenderer.llmCall(event.agent, event.provider, event.model, event.turn);
        break;
      case "tool_call":
        flowRenderer.toolCall(event.agent, event.toolName, event.args);
        break;
      case "tool_result":
        flowRenderer.toolResult(event.agent, event.toolName, event.result);
        break;
      case "task_handoff":
        flowRenderer.taskHandoff(event.fromAgent, event.toAgent, event.reason, event.newTaskId, event.toProvider, event.toModel);
        break;
      case "text_delta":
        flowRenderer.textDelta(event.content);
        break;
      case "task_completed":
        flowRenderer.taskCompleted(event.taskId, event.agent);
        break;
      case "task_failed":
        flowRenderer.taskFailed(event.taskId, event.agent, event.error);
        break;
      case "guardrail_triggered":
        flowRenderer.guardrailTriggered(event.guardrail, event.result.message);
        break;
      case "flow_complete":
        flowRenderer.flowComplete(event.flow);
        break;
    }
  }

  // ─── Command handler ───

  function handleCommand(input: string): boolean {
    const [cmd, ...args] = input.split(" ");

    switch (cmd) {
      case "/":
      case "/help":
        printHelp();
        return false;

      case "/provider": {
        const name = args[0];
        if (!name) {
          console.log(`\n${C.dim}Available providers:${C.reset}`);
          for (const key of providerNames) {
            const pc = config.providers[key];
            const display = getDisplayName(key);
            const active = key === activeAgent.provider ? ` ${C.green}← active${C.reset}` : "";
            const toolIcon = pc.nativeToolCall ? "✅" : "❌";
            console.log(
              `  ${C.cyan}${display}${C.reset} ${C.dim}model=${pc.model} toolCall=${toolIcon}${C.reset}${active}`
            );
          }
          console.log(`\n${C.dim}Usage: /provider <name> (e.g. /provider claude)${C.reset}\n`);
          return false;
        }

        const resolved = resolveProviderName(name, providerNames);
        if (!resolved) {
          const available = providerNames.map((k) => getDisplayName(k)).join(", ");
          console.log(`${C.red}Provider "${name}" not found. Available: ${available}${C.reset}\n`);
          return false;
        }

        const pc = config.providers[resolved];
        const display = getDisplayName(resolved);

        const newAgent = defineAgent({
          name: "assistant",
          instructions: DEFAULT_SYSTEM_PROMPT,
          provider: resolved,
          model: pc.model,
        });

        const idx = agents.findIndex((a) => a.name === "assistant");
        if (idx >= 0) agents[idx] = newAgent;
        else agents.push(newAgent);

        activeAgent = newAgent;
        runner.registerAgents([newAgent]);

        // Update prompt display (show provider name)
        prompt.setCurrentAgent(display);

        console.log(`${C.green}Switched to ${C.cyan}${C.bold}${display}${C.reset}${C.green} (${pc.model})${C.reset}\n`);
        return false;
      }

      case "/agents":
        console.log(`\n${C.dim}Registered agents:${C.reset}`);
        for (const a of agents) {
          const marker = a.name === activeAgent.name ? ` ${C.green}← active${C.reset}` : "";
          const display = getDisplayName(a.provider);
          console.log(
            `  🤖 ${C.cyan}${a.name}${C.reset} ${C.dim}(${display}/${a.model})${C.reset}${marker}`
          );
        }
        console.log();
        return false;

      case "/agent": {
        const name = args[0];
        if (!name) { console.log(`${C.yellow}Usage: /agent <name>${C.reset}`); return false; }
        const found = agents.find((a) => a.name === name);
        if (found) {
          activeAgent = found;

          // Update prompt display (show agent name for custom agents, provider name for default)
          const displayName = found.name === "assistant"
            ? getDisplayName(found.provider)
            : found.name;
          prompt.setCurrentAgent(displayName);

          const display = getDisplayName(found.provider);
          console.log(`${C.dim}Switched to: ${C.cyan}${found.name}${C.reset} ${C.dim}(${display}/${found.model})${C.reset}\n`);
        } else {
          console.log(`${C.red}Agent "${name}" not found.${C.reset}`);
        }
        return false;
      }

      case "/clear":
        ctx.history = [];
        ctx.handoffChain = [];
        console.log(`${C.dim}History cleared.${C.reset}\n`);
        return false;

      case "/verbose":
        flowRenderer.setVerbose(!flowRenderer.isVerbose());
        console.log(`${C.dim}Verbose mode: ${flowRenderer.isVerbose() ? "on" : "off"}${C.reset}\n`);
        return false;

      case "/skills": {
        const skills = skillLoader.list();
        console.log(`\n${C.cyan}${C.bold}Available Skills${C.reset}`);
        console.log(`${C.dim}─────────────────${C.reset}`);

        if (skills.length === 0) {
          console.log(`${C.dim}No skills found.${C.reset}\n`);
        } else {
          for (const skill of skills) {
            console.log(`\n${C.green}${skill.name}${C.reset} ${C.dim}(v${skill.version})${C.reset}`);
            console.log(`  ${skill.description}`);
            if (skill.agents && skill.agents.length > 0) {
              console.log(`  ${C.dim}Agents: ${skill.agents.join(", ")}${C.reset}`);
            }
          }
          console.log(`\n${C.dim}Use /skill <name> to view details${C.reset}\n`);
        }
        return false;
      }

      case "/skill": {
        const skillName = args[0];
        if (!skillName) {
          console.log(`${C.yellow}Usage: /skill <name>${C.reset}\n`);
          return false;
        }

        const skill = skillLoader.get(skillName);
        if (!skill) {
          console.log(`${C.yellow}Skill not found: ${skillName}${C.reset}\n`);
          console.log(`${C.dim}Use /skills to list available skills${C.reset}\n`);
          return false;
        }

        console.log(`\n${C.cyan}${C.bold}${skill.metadata.name}${C.reset} ${C.dim}(v${skill.metadata.version})${C.reset}`);
        console.log(`${C.dim}─────────────────${C.reset}`);
        console.log(`${skill.metadata.description}`);
        if (skill.metadata.author) {
          console.log(`${C.dim}Author: ${skill.metadata.author}${C.reset}`);
        }
        if (skill.metadata.agents && skill.metadata.agents.length > 0) {
          console.log(`${C.dim}Agents: ${skill.metadata.agents.join(", ")}${C.reset}`);
        }
        console.log(`\n${C.dim}─────────────────${C.reset}`);
        console.log(skill.content);
        console.log();
        return false;
      }

      case "/quit":
      case "/exit":
        console.log(`${C.dim}Goodbye!${C.reset}`);
        return true;

      default:
        console.log(`${C.yellow}Unknown command: ${cmd}. Type /help for available commands.${C.reset}`);
        return false;
    }
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
