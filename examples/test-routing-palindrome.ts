/**
 * Test routing for palindrome algorithm task
 */

import {
  createComplexityClassifier,
  createAgentMatcher,
  AgentRegistry,
} from "../src/index.js";
import * as path from "path";

console.log("=== Palindrome Algorithm Routing Test ===\n");

const input = "帮我生成一个有效回文子串算法";

console.log(`Input: "${input}"\n`);

// Load agents
const registry = new AgentRegistry({
  projectAgentsDir: path.join(process.cwd(), ".agents"),
  enableHotReload: false,
});

await registry.loadAll();

const agents = registry.list();
console.log(`Loaded ${agents.length} agents:\n`);

for (const agent of agents) {
  console.log(`  - ${agent.name}`);
  console.log(`    Summary: ${agent.capabilities?.summary}`);
  console.log(`    Best for: ${agent.capabilities?.bestFor?.join(", ")}`);
  console.log(`    Strengths: ${agent.capabilities?.modelStrengths?.join(", ")}\n`);
}

// Test complexity
const complexityClassifier = createComplexityClassifier();
const complexityResult = complexityClassifier.classify(input);

console.log("─── Complexity Analysis ───\n");
console.log(`Score: ${complexityResult.complexity.toFixed(2)}/100`);
console.log(`Decision: ${complexityResult.decision}\n`);

// Test agent matching
const agentMatcher = createAgentMatcher(agents);

// Simulate current agent is assistant (doubao)
const currentAgent = agents.find(a => a.name === "doubao-chinese-vision")!;

console.log("─── Agent Matching ───\n");
console.log(`Current Agent: ${currentAgent.name}\n`);

const matchResult = agentMatcher.findBestAgent(input, currentAgent, agents);

console.log(`Best Match: ${matchResult.bestAgent.name}`);
console.log(`Similarity: ${(matchResult.similarity * 100).toFixed(2)}%`);
console.log(`Should Handoff: ${matchResult.shouldHandoff}`);
console.log(`Reasoning: ${matchResult.reasoning}\n`);

console.log("─── All Agent Scores ───\n");
for (const score of matchResult.allScores) {
  console.log(`  ${score.agent}: ${(score.similarity * 100).toFixed(2)}%`);
}

console.log("\n─── Expected vs Actual ───\n");
console.log(`Expected: claude-opus-coder (algorithm implementation)`);
console.log(`Actual: ${matchResult.bestAgent.name}`);
console.log(`Result: ${matchResult.bestAgent.name === "claude-opus-coder" ? "✅ PASS" : "❌ FAIL"}`);
