/**
 * Example: Using Skills + AGENTS.md together
 */

import {
  defineAgent,
  SkillLoader,
  AgentsMdLoader,
  createActivateSkillTool,
  getDefaultSystemPrompt,
} from "../src/index.js";

console.log("=== Complete Example: Skills + AGENTS.md ===\n");

// 1. Load skills (multi-tier)
console.log("1. Loading skills from all tiers...");
const skillLoader = new SkillLoader(".skills");
const skillMetadata = skillLoader.listMetadata();

console.log(`   Found ${skillMetadata.length} skill(s):`);
skillMetadata.forEach(s => {
  console.log(`     - ${s.name} (${s.scope}): ${s.description.substring(0, 50)}...`);
});

// 2. Load AGENTS.md hierarchy
console.log("\n2. Loading AGENTS.md hierarchy...");
const agentsMdLoader = new AgentsMdLoader();
const agentsMdFiles = agentsMdLoader.loadHierarchy();

console.log(`   Found ${agentsMdFiles.length} AGENTS.md file(s):`);
agentsMdFiles.forEach(f => {
  console.log(`     - ${f.path} (depth: ${f.depth})`);
});

// 3. Create activate_skill tool
console.log("\n3. Creating activate_skill tool...");
const activateSkillTool = createActivateSkillTool(
  skillLoader,
  skillMetadata.map(s => s.name)
);
console.log(`   ✓ Tool created: ${activateSkillTool.name}`);

// 4. Generate system prompt with both skills and AGENTS.md
console.log("\n4. Generating system prompt...");
const systemPrompt = getDefaultSystemPrompt(skillMetadata, agentsMdFiles);

console.log(`   Generated ${systemPrompt.length} characters`);
console.log("\n   Structure:");

if (systemPrompt.includes("## Available Skills")) {
  console.log("     ✓ Includes Skills section");
}

if (systemPrompt.includes("## Project Instructions (AGENTS.md)")) {
  console.log("     ✓ Includes AGENTS.md section");
}

console.log("\n   Preview (first 500 chars):");
console.log("   " + systemPrompt.substring(0, 500).replace(/\n/g, "\n   ") + "...");

// 5. Define agent with everything
console.log("\n5. Defining agent with skills and AGENTS.md support...");

const agent = defineAgent({
  name: "assistant",
  instructions: systemPrompt, // Includes both skills and AGENTS.md
  tools: [activateSkillTool],
  provider: "openai",
  model: "gpt-4o",
});

console.log(`   ✓ Agent "${agent.name}" defined`);
console.log(`   - Provider: ${agent.provider}`);
console.log(`   - Model: ${agent.model}`);
console.log(`   - Tools: ${agent.tools?.length || 0}`);
console.log(`   - System prompt length: ${systemPrompt.length} chars`);

console.log("\n=== Complete ===");
console.log("\nThe agent now has:");
console.log("  ✓ Multi-tier skills discovery (System → User → Workspace)");
console.log("  ✓ Progressive disclosure (activate_skill tool)");
console.log("  ✓ Hierarchical AGENTS.md support");
console.log("  ✓ .agents/skills alias for cross-tool compatibility");
console.log("\nToken efficiency:");
console.log("  - Skills metadata: ~100 tokens per 10 skills");
console.log("  - AGENTS.md: ~200-500 tokens per file");
console.log("  - Full skill content: Only loaded when activated (~5k tokens)");
console.log("\nThis is a production-ready configuration!");
