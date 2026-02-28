/**
 * Test synonym expansion in agent matching
 */

import {
  createAgentMatcher,
  AgentRegistry,
} from "../src/index.js";
import * as path from "path";

console.log("=== Synonym Expansion Test ===\n");

// Load agents
const registry = new AgentRegistry({
  projectAgentsDir: path.join(process.cwd(), ".agents"),
  enableHotReload: false,
});

await registry.loadAll();
const agents = registry.list();

const agentMatcher = createAgentMatcher(agents);
const currentAgent = agents.find(a => a.name === "doubao-chinese-vision")!;

// Test cases with different expressions
const testCases = [
  "帮我写一个代码",
  "帮我生成一个算法",
  "帮我实现一个功能",
  "帮我开发一个程序",
  "帮我创建一个脚本",
  "写一个排序算法",
  "实现快速排序",
  "生成一个回文检测函数",
];

console.log("Testing different coding-related expressions:\n");

for (const input of testCases) {
  const matchResult = agentMatcher.findBestAgent(input, currentAgent, agents);

  const icon = matchResult.bestAgent.name === "claude-opus-coder" ? "✅" : "❌";
  console.log(`${icon} "${input}"`);
  console.log(`   → ${matchResult.bestAgent.name} (${(matchResult.similarity * 100).toFixed(1)}%)`);
  console.log();
}

console.log("─── Summary ───\n");

const successCount = testCases.filter(input => {
  const result = agentMatcher.findBestAgent(input, currentAgent, agents);
  return result.bestAgent.name === "claude-opus-coder";
}).length;

console.log(`Success rate: ${successCount}/${testCases.length} (${(successCount / testCases.length * 100).toFixed(1)}%)`);
console.log(`Expected: All should route to claude-opus-coder`);
