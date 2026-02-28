import { C, printHelp, resolveProviderName, getDisplayName } from "../ui/index.js";
import { defineAgent } from "../../core/agent/agent.js";
import { DEFAULT_SYSTEM_PROMPT } from "../../core/prompts.js";
import type { AgentConfig, FrameworkConfig, AgentContext } from "../../types.js";
import type { Runner } from "../../core/runner/runner.js";
import type { InteractivePrompt } from "../autocomplete.js";
import type { FlowRenderer } from "../ui/flow-renderer.js";
import type { SkillLoader } from "../../core/skills.js";

export interface CommandContext {
  config: FrameworkConfig;
  agents: AgentConfig[];
  activeAgent: AgentConfig;
  ctx: AgentContext;
  runner: Runner;
  flowRenderer: FlowRenderer;
  prompt: InteractivePrompt;
  skillLoader: SkillLoader;
  providerNames: string[];
}

export type CommandHandler = (
  args: string[],
  context: CommandContext
) => { shouldExit: boolean; newActiveAgent?: AgentConfig };

export function handleCommand(input: string, context: CommandContext): boolean {
  const [cmd, ...args] = input.split(" ");

  switch (cmd) {
    case "/":
    case "/help":
      printHelp();
      return false;

    case "/provider": {
      const result = handleProviderCommand(args, context);
      if (result.newActiveAgent) {
        context.activeAgent = result.newActiveAgent;
      }
      return result.shouldExit;
    }

    case "/agents":
      return handleAgentsCommand(args, context).shouldExit;

    case "/agent": {
      const result = handleAgentCommand(args, context);
      if (result.newActiveAgent) {
        context.activeAgent = result.newActiveAgent;
      }
      return result.shouldExit;
    }

    case "/clear":
      return handleClearCommand(args, context).shouldExit;

    case "/verbose":
      return handleVerboseCommand(args, context).shouldExit;

    case "/skills":
      return handleSkillsCommand(args, context).shouldExit;

    case "/skill":
      return handleSkillCommand(args, context).shouldExit;

    case "/quit":
    case "/exit":
      console.log(`${C.dim}Goodbye!${C.reset}`);
      return true;

    default:
      console.log(`${C.yellow}Unknown command: ${cmd}. Type /help for available commands.${C.reset}`);
      return false;
  }
}

function handleProviderCommand(args: string[], context: CommandContext): { shouldExit: boolean; newActiveAgent?: AgentConfig } {
  const { config, agents, activeAgent, runner, prompt, providerNames } = context;
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
    return { shouldExit: false };
  }

  const resolved = resolveProviderName(name, providerNames);
  if (!resolved) {
    const available = providerNames.map((k) => getDisplayName(k)).join(", ");
    console.log(`${C.red}Provider "${name}" not found. Available: ${available}${C.reset}\n`);
    return { shouldExit: false };
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

  runner.registerAgents([newAgent]);

  // Update prompt display (show provider name)
  prompt.setCurrentAgent(display);

  console.log(`${C.green}Switched to ${C.cyan}${C.bold}${display}${C.reset}${C.green} (${pc.model})${C.reset}\n`);
  return { shouldExit: false, newActiveAgent: newAgent };
}

function handleAgentsCommand(args: string[], context: CommandContext): { shouldExit: boolean } {
  const { agents, activeAgent } = context;

  console.log(`\n${C.dim}Registered agents:${C.reset}`);
  for (const a of agents) {
    const marker = a.name === activeAgent.name ? ` ${C.green}← active${C.reset}` : "";
    const display = getDisplayName(a.provider);
    console.log(
      `  🤖 ${C.cyan}${a.name}${C.reset} ${C.dim}(${display}/${a.model})${C.reset}${marker}`
    );
  }
  console.log();
  return { shouldExit: false };
}

function handleAgentCommand(args: string[], context: CommandContext): { shouldExit: boolean; newActiveAgent?: AgentConfig } {
  const { agents, prompt } = context;
  const name = args[0];

  if (!name) {
    console.log(`${C.yellow}Usage: /agent <name>${C.reset}`);
    return { shouldExit: false };
  }

  const found = agents.find((a) => a.name === name);
  if (found) {
    // Update prompt display (show agent name for custom agents, provider name for default)
    const displayName = found.name === "assistant"
      ? getDisplayName(found.provider)
      : found.name;
    prompt.setCurrentAgent(displayName);

    const display = getDisplayName(found.provider);
    console.log(`${C.dim}Switched to: ${C.cyan}${found.name}${C.reset} ${C.dim}(${display}/${found.model})${C.reset}\n`);
    return { shouldExit: false, newActiveAgent: found };
  } else {
    console.log(`${C.red}Agent "${name}" not found.${C.reset}`);
    return { shouldExit: false };
  }
}

function handleClearCommand(args: string[], context: CommandContext): { shouldExit: boolean } {
  const { ctx } = context;
  ctx.history = [];
  ctx.handoffChain = [];
  console.log(`${C.dim}History cleared.${C.reset}\n`);
  return { shouldExit: false };
}

function handleVerboseCommand(args: string[], context: CommandContext): { shouldExit: boolean } {
  const { flowRenderer } = context;
  flowRenderer.setVerbose(!flowRenderer.isVerbose());
  console.log(`${C.dim}Verbose mode: ${flowRenderer.isVerbose() ? "on" : "off"}${C.reset}\n`);
  return { shouldExit: false };
}

function handleSkillsCommand(args: string[], context: CommandContext): { shouldExit: boolean } {
  const { skillLoader } = context;
  const skills = skillLoader.list();

  console.log(`\n${C.cyan}${C.bold}Available Skills${C.reset}`);
  console.log(`${C.dim}─────────────────${C.reset}`);

  if (skills.length === 0) {
    console.log(`${C.dim}No skills found.${C.reset}\n`);
  } else {
    for (const skill of skills) {
      console.log(`\n${C.green}${skill.name}${C.reset}`);
      console.log(`  ${skill.description}`);
    }
    console.log(`\n${C.dim}Use /skill <name> to view details${C.reset}\n`);
  }
  return { shouldExit: false };
}

function handleSkillCommand(args: string[], context: CommandContext): { shouldExit: boolean } {
  const { skillLoader } = context;
  const skillName = args[0];

  if (!skillName) {
    console.log(`${C.yellow}Usage: /skill <name>${C.reset}\n`);
    return { shouldExit: false };
  }

  const skill = skillLoader.get(skillName);
  if (!skill) {
    console.log(`${C.yellow}Skill not found: ${skillName}${C.reset}\n`);
    console.log(`${C.dim}Use /skills to list available skills${C.reset}\n`);
    return { shouldExit: false };
  }

  console.log(`\n${C.cyan}${C.bold}${skill.metadata.name}${C.reset}`);
  console.log(`${C.dim}─────────────────${C.reset}`);
  console.log(`${skill.metadata.description}`);
  console.log(`\n${C.dim}─────────────────${C.reset}`);
  console.log(skill.content);
  console.log();
  return { shouldExit: false };
}
