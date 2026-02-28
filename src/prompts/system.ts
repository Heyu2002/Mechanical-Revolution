/**
 * System prompt loader
 * Loads the base system instructions from Markdown file
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load system prompt from Markdown file
 */
function loadSystemPrompt(): string {
  try {
    const mdPath = join(__dirname, 'base_instructions', 'default.md');
    return readFileSync(mdPath, 'utf-8');
  } catch (error) {
    console.warn('Failed to load base_instructions/default.md, using fallback');
    return FALLBACK_SYSTEM_PROMPT;
  }
}

/**
 * Fallback system prompt (in case MD file is not available)
 */
const FALLBACK_SYSTEM_PROMPT = `
You are an AI assistant within Mechanical Revolution, a multi-agent collaboration framework.

Your capabilities include:
- Multi-language conversation
- Task analysis and decomposition
- Code assistance
- Information retrieval
- Logical reasoning

Behavioral guidelines:
- Be concise and direct
- Think step by step
- Admit uncertainty clearly
- Adapt response depth to question complexity
- Respond in the user's language
`;

/**
 * The default system prompt loaded from base_instructions/default.md
 */
export const DEFAULT_SYSTEM_PROMPT: string = loadSystemPrompt();

/**
 * Legacy interface for backward compatibility
 * @deprecated Use DEFAULT_SYSTEM_PROMPT directly
 */
export interface SystemPromptParts {
  identity: string;
  capabilities: string;
  behavior: string;
  constraints: string;
  outputFormat: string;
}

/**
 * Legacy builder for backward compatibility
 * @deprecated Use DEFAULT_SYSTEM_PROMPT directly
 */
export function buildSystemPrompt(parts?: Partial<SystemPromptParts>): string {
  if (parts && Object.keys(parts).length > 0) {
    console.warn('buildSystemPrompt with custom parts is deprecated. Use DEFAULT_SYSTEM_PROMPT and append custom instructions.');
  }
  return DEFAULT_SYSTEM_PROMPT;
}

/**
 * Legacy parts export for backward compatibility
 * @deprecated Use DEFAULT_SYSTEM_PROMPT directly
 */
export const PROMPT_PARTS: SystemPromptParts = {
  identity: 'See base_instructions/default.md',
  capabilities: 'See base_instructions/default.md',
  behavior: 'See base_instructions/default.md',
  constraints: 'See base_instructions/default.md',
  outputFormat: 'See base_instructions/default.md',
};
