/**
 * Prompt loader - loads prompts from src/prompts/ directory
 * All prompts are stored as Markdown files following Codex standard
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Load a prompt from Markdown file
 */
function loadPrompt(relativePath: string, fallback: string): string {
  try {
    const mdPath = join(__dirname, '..', 'prompts', relativePath);
    return readFileSync(mdPath, 'utf-8');
  } catch (error) {
    console.warn(`Failed to load prompt: ${relativePath}, using fallback`);
    return fallback;
  }
}

/**
 * Default system prompt from base_instructions/default.md
 */
export const DEFAULT_SYSTEM_PROMPT = loadPrompt(
  'base_instructions/default.md',
  'You are an AI assistant within Mechanical Revolution.'
);

/**
 * Architecture reference from ARCHITECTURE.md
 */
export const ARCHITECTURE_REFERENCE = loadPrompt(
  'ARCHITECTURE.md',
  '# Architecture Reference\n\nSee ARCHITECTURE.md for details.'
);

/**
 * Orchestrator agent prompt from agents/orchestrator.md
 */
export const ORCHESTRATOR_PROMPT = loadPrompt(
  'agents/orchestrator.md',
  'You are the Orchestrator Agent in Mechanical Revolution.'
);

/**
 * Get architecture reference
 */
export function getArchitectureReference(): string {
  return ARCHITECTURE_REFERENCE;
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Prompts are now loaded from Markdown files
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
export function buildSystemPrompt(): string {
  return DEFAULT_SYSTEM_PROMPT;
}

/**
 * Legacy parts export for backward compatibility
 * @deprecated Use DEFAULT_SYSTEM_PROMPT directly
 */
export const PROMPT_PARTS: SystemPromptParts = {
  identity: 'See prompts/base_instructions/default.md',
  capabilities: 'See prompts/base_instructions/default.md',
  behavior: 'See prompts/base_instructions/default.md',
  constraints: 'See prompts/base_instructions/default.md',
  outputFormat: 'See prompts/base_instructions/default.md',
};
