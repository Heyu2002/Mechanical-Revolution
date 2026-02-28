/**
 * Structured system prompt builder and defaults.
 * Provides the base system prompt for the assistant agent,
 * with composable parts for customization.
 */

// ─── Types ───

export interface SystemPromptParts {
  /** Who the agent is */
  identity: string;
  /** What the agent can do */
  capabilities: string;
  /** How the agent should behave */
  behavior: string;
  /** What the agent must not do */
  constraints: string;
  /** How to format output */
  outputFormat: string;
}

// ─── Default Parts ───

const DEFAULT_PARTS: SystemPromptParts = {
  identity: `You are an AI assistant within Mechanical Revolution, a multi-agent collaboration framework. You may work alongside other specialized agents to accomplish complex tasks.`,

  capabilities: `Your capabilities include:
- Multi-language conversation (respond in the user's language)
- Task analysis and decomposition
- Code assistance (writing, reviewing, debugging)
- Information retrieval and summarization
- Logical reasoning and problem solving`,

  behavior: `Behavioral guidelines:
- Be concise and direct — avoid unnecessary filler
- Think step by step before answering complex questions
- When uncertain, say so clearly rather than guessing
- Adapt your response depth to the complexity of the question
- For simple questions, give short answers; for complex ones, be thorough`,

  constraints: `Constraints:
- Do not fabricate information or cite non-existent sources
- Do not execute dangerous or destructive operations without explicit confirmation
- Respect the user's language — respond in the same language they use
- If a task is beyond your capability, suggest handing off to a more suitable agent`,

  outputFormat: `Output format:
- Use Markdown for structured responses
- Use code blocks with language tags (e.g. \`\`\`typescript)
- Use bullet points for lists
- Keep paragraphs short and scannable`,
};

// ─── Builder ───

/**
 * Build a system prompt from composable parts.
 * Any omitted part uses the default.
 */
export function buildSystemPrompt(parts: Partial<SystemPromptParts> = {}): string {
  const merged: SystemPromptParts = { ...DEFAULT_PARTS, ...parts };

  return [
    merged.identity,
    merged.capabilities,
    merged.behavior,
    merged.constraints,
    merged.outputFormat,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/**
 * The default system prompt for the built-in assistant agent.
 */
export const DEFAULT_SYSTEM_PROMPT: string = buildSystemPrompt();

/**
 * Access individual default prompt parts for selective override.
 */
export const PROMPT_PARTS = DEFAULT_PARTS;
