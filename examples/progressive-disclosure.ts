/**
 * Example: Using Progressive Disclosure for Skills
 *
 * This example demonstrates how to use the progressive disclosure system
 * to efficiently manage skills in your multi-agent system.
 */

import {
  defineAgent,
  Runner,
  loadConfig,
  registerBuiltinProviders,
  SkillLoader,
  createActivateSkillTool,
  getDefaultSystemPrompt,
} from "mechanical-revolution";

// ─── Setup ───

const config = loadConfig();
registerBuiltinProviders();

// ─── Initialize Skill System ───

// 1. Create skill loader
const skillLoader = new SkillLoader(".skills");

// 2. Get skill metadata (Level 1: only name + description)
const skillMetadata = skillLoader.listMetadata();
console.log(`Found ${skillMetadata.length} skills:`);
skillMetadata.forEach(s => console.log(`  - ${s.name}: ${s.description}`));

// 3. Create activate_skill tool
const activateSkillTool = createActivateSkillTool(
  skillLoader,
  skillMetadata.map(s => s.name)
);

// ─── Define Agent with Skills Support ───

const agentWithSkills = defineAgent({
  name: "assistant",
  // Inject skills metadata into system prompt
  instructions: getDefaultSystemPrompt(skillMetadata),
  provider: "openai",
  model: "gpt-4o",
  // Include activate_skill tool
  tools: [activateSkillTool],
});

// ─── Run ───

const runner = new Runner(config, [agentWithSkills]);

// Example 1: User explicitly requests a skill
const result1 = await runner.run(
  agentWithSkills,
  "Use the task-decomposition skill to help me build a web scraper"
);
console.log(result1.output);

// Example 2: Task matches skill description (implicit activation)
const result2 = await runner.run(
  agentWithSkills,
  "I need to break down this complex project into smaller tasks and assign them to different specialists"
);
console.log(result2.output);

// ─── Check Activated Skills ───

console.log("\nActivated skills:", result2.context.metadata.activatedSkills);

// ─── How It Works ───

/**
 * Progressive Disclosure Flow:
 *
 * 1. Level 1 (Always Loaded):
 *    - Skill metadata (name + description) is injected into system prompt
 *    - LLM can see all available skills
 *    - Minimal token usage (~100 tokens for 10 skills)
 *
 * 2. Level 2 (On Activation):
 *    - When LLM decides to use a skill, it calls activate_skill tool
 *    - Full SKILL.md content is loaded and returned
 *    - Folder structure is included
 *    - Moderate token usage (~5k tokens per skill)
 *
 * 3. Level 3 (On Demand):
 *    - LLM can read reference files using file tools
 *    - LLM can execute scripts using execution tools
 *    - LLM can use assets as templates
 *    - Variable token usage (only what's needed)
 *
 * Benefits:
 * - Efficient context window usage
 * - Scales to many skills (10-50+)
 * - LLM only loads what it needs
 * - Clear activation signal for observability
 */
