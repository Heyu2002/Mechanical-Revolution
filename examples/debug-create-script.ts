/**
 * Debug "创建脚本" routing issue
 */

import {
  createAgentMatcher,
  AgentRegistry,
} from "../src/index.js";
import * as path from "path";

console.log("=== Debug: 帮我创建一个脚本 ===\n");

const input = "帮我创建一个脚本";

// Load agents
const registry = new AgentRegistry({
  projectAgentsDir: path.join(process.cwd(), ".agents"),
  enableHotReload: false,
});

await registry.loadAll();
const agents = registry.list();

const agentMatcher = createAgentMatcher(agents);
const currentAgent = agents.find(a => a.name === "doubao-chinese-vision")!;

const matchResult = agentMatcher.findBestAgent(input, currentAgent, agents);

console.log(`Input: "${input}"\n`);

console.log("─── All Agent Scores ───\n");
for (const score of matchResult.allScores) {
  console.log(`  ${score.agent}: ${(score.similarity * 100).toFixed(2)}%`);
}

console.log("\n─── Best Match ───\n");
console.log(`Agent: ${matchResult.bestAgent.name}`);
console.log(`Similarity: ${(matchResult.similarity * 100).toFixed(2)}%`);
console.log(`Should Handoff: ${matchResult.shouldHandoff}`);
console.log(`Reasoning: ${matchResult.reasoning}`);

console.log("\n─── Analysis ───\n");
console.log("Keywords in input:");
console.log("  - 帮 (help)");
console.log("  - 我 (me)");
console.log("  - 创建 (create) → should map to 编码");
console.log("  - 一个 (a/an)");
console.log("  - 脚本 (script) → should map to 代码");

console.log("\nExpected: claude-opus-coder");
console.log(`Actual: ${matchResult.bestAgent.name}`);
console.log(`Result: ${matchResult.bestAgent.name === "claude-opus-coder" ? "✅ PASS" : "❌ FAIL"}`);
