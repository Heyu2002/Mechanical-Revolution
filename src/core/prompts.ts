import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { SkillMetadata } from "./skills.js";
import { renderSkillsSection } from "./skill-prompt.js";
import type { AgentsMdFile } from "./agents-md.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Get a prompt by reading the markdown file directly.
 * Simple and direct - no pre-generation, no caching.
 *
 * In development: reads from src/prompts/
 * In production: reads from dist/prompts/ (copied during build)
 *
 * @param relativePath - Path relative to prompts/
 * @returns The prompt content as a string
 */
export function getPrompt(relativePath: string): string {
  // In dist: __dirname is dist/chunk-xxx.js or dist/
  // We want dist/prompts/
  // In src: __dirname is src/core/
  // We want src/prompts/

  // Try production path first (dist/prompts)
  const distPath = join(__dirname, "prompts", relativePath);

  try {
    return readFileSync(distPath, "utf-8");
  } catch {
    // Fallback to development path (src/prompts)
    const srcPath = join(__dirname, "../prompts", relativePath);
    return readFileSync(srcPath, "utf-8");
  }
}

/**
 * Get the default system prompt with optional skills and AGENTS.md injection.
 *
 * @param skills - Optional list of available skills to inject
 * @param agentsMdFiles - Optional AGENTS.md files to inject
 * @returns System prompt with skills and AGENTS.md sections (if provided)
 */
export function getDefaultSystemPrompt(
  skills?: SkillMetadata[],
  agentsMdFiles?: AgentsMdFile[]
): string {
  const basePrompt = getPrompt("base_instructions/default.md");

  const sections: string[] = [basePrompt];

  // Add AGENTS.md section if provided
  if (agentsMdFiles && agentsMdFiles.length > 0) {
    const agentsMdSection = renderAgentsMdSection(agentsMdFiles);
    sections.push(agentsMdSection);
  }

  // Add skills section if provided
  if (skills && skills.length > 0) {
    const skillsSection = renderSkillsSection(skills);
    sections.push(skillsSection);
  }

  return sections.join("\n\n");
}

/**
 * Render AGENTS.md files into system prompt format.
 */
function renderAgentsMdSection(files: AgentsMdFile[]): string {
  const sections = files.map((file, index) => {
    const level = index === 0 ? "Current Directory" : `Parent Level ${file.depth}`;
    return `### ${level} (${file.path})

${file.content}`;
  }).join("\n\n");

  return `
## Project Instructions (AGENTS.md)

The following instructions are from AGENTS.md files in this repository. These files provide project-specific guidance and conventions.

**Precedence Rules**:
- More deeply nested AGENTS.md files take precedence over parent files
- Direct user instructions take precedence over AGENTS.md
- When instructions conflict, follow the most specific (deepest) one

${sections}

**Important**: Follow these instructions when working on files within their scope. The scope of an AGENTS.md file is the entire directory tree rooted at the folder that contains it.
`.trim();
}

/**
 * Default system prompt from base_instructions/default.md
 */
export const DEFAULT_SYSTEM_PROMPT = getPrompt("base_instructions/default.md");

/**
 * Orchestrator agent prompt from agents/orchestrator.md
 */
export const ORCHESTRATOR_PROMPT = getPrompt("agents/orchestrator.md");

/**
 * Architecture reference from ARCHITECTURE.md
 */
export const ARCHITECTURE_REFERENCE = getPrompt("ARCHITECTURE.md");

/**
 * Get architecture reference
 */
export function getArchitectureReference(): string {
  return ARCHITECTURE_REFERENCE;
}

/**
 * Legacy interface for backward compatibility
 * @deprecated Prompts are now loaded directly from files
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
