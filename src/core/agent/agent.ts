import type { AgentConfig, AgentContext } from "../../types.js";
import { ORCHESTRATOR_PROMPT } from "../../prompts/agents.js";

const DEFAULT_MAX_TURNS = 10;

/**
 * Define an agent with its configuration.
 *
 * @example
 * const agent = defineAgent({
 *   name: "researcher",
 *   instructions: "You are a research assistant.",
 *   provider: "openai",
 *   model: "gpt-4o",
 *   tools: [searchTool],
 *   handoffs: [handoff(analystAgent)],
 * });
 */
export function defineAgent(config: AgentConfig): AgentConfig {
  return {
    ...config,
    maxTurns: config.maxTurns ?? DEFAULT_MAX_TURNS,
    tools: config.tools ?? [],
    handoffs: config.handoffs ?? [],
    guardrails: config.guardrails ?? [],
  };
}

/**
 * Resolve the system prompt for an agent.
 * Supports both static strings and dynamic functions.
 */
export function resolveInstructions(
  agent: AgentConfig,
  ctx: AgentContext
): string {
  return typeof agent.instructions === "function"
    ? agent.instructions(ctx)
    : agent.instructions;
}

/**
 * Create Orchestrator instructions with dynamic agent capabilities injection.
 *
 * @param agents - List of all available agents (orchestrator will be filtered out)
 * @returns Complete orchestrator instructions with agent capabilities embedded
 *
 * @example
 * const orchestratorAgent = defineAgent({
 *   name: "orchestrator",
 *   instructions: (ctx) => createOrchestratorInstructions(allAgents),
 *   provider: "openai",
 *   model: "gpt-4o",
 *   handoffs: [...]
 * });
 */
export function createOrchestratorInstructions(agents: AgentConfig[]): string {
  const agentCapabilitiesText = agents
    .filter(a => a.name !== 'orchestrator' && a.capabilities)
    .map(a => {
      const cap = a.capabilities!;
      return `
**${a.name}** (${a.provider}/${a.model}):
- Summary: ${cap.summary}
- Model Strengths: ${cap.modelStrengths.join(', ')}
- Task Types: ${cap.taskTypes.join(', ')}
${cap.languages ? `- Languages: ${cap.languages.join(', ')}` : ''}
${cap.bestFor ? `- Best For: ${cap.bestFor.join('; ')}` : ''}
${cap.limitations ? `- Limitations: ${cap.limitations.join('; ')}` : ''}
`.trim();
    })
    .join('\n\n');

  return ORCHESTRATOR_PROMPT.replace(
    '{{AGENT_CAPABILITIES}}',
    agentCapabilitiesText || '(No specialist agents registered)'
  );
}
