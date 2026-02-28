// ─── System Prompt Builder ───
export {
  DEFAULT_SYSTEM_PROMPT,
  PROMPT_PARTS,
  buildSystemPrompt,
} from "./system.js";
export type { SystemPromptParts } from "./system.js";

// ─── Agent-Specific Prompts ───
export {
  TRIAGE_PROMPT,
  RESEARCHER_PROMPT,
  MATHEMATICIAN_PROMPT,
  CODER_PROMPT,
  TRANSLATOR_PROMPT,
  SUMMARIZER_PROMPT,
  ORCHESTRATOR_PROMPT,
  AGENT_PROMPTS,
} from "./agents.js";
