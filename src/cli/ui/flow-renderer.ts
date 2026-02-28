import { C } from "./colors.js";
import { getDisplayName } from "./provider-names.js";
import type { TaskFlow } from "../../types.js";

// ─── Task Flow Renderer ───

export class FlowRenderer {
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
