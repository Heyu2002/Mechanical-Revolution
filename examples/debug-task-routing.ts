/**
 * Test Task Routing for Algorithm Implementation
 *
 * 测试算法实现任务的路由决策
 */

import {
  createComplexityClassifier,
  createAgentMatcher,
  AgentRegistry,
} from "../src/index.js";
import * as path from "path";

console.log("=== Task Routing Analysis ===\n");

// 测试输入
const input = "帮我写一个满足正态分布的随机数算法";

console.log(`Input: "${input}"\n`);

// 1. 复杂度判断
console.log("─── Step 1: Complexity Classification ───\n");

const complexityClassifier = createComplexityClassifier();
const complexityResult = complexityClassifier.classify(input);

console.log(`Complexity Score: ${complexityResult.complexity.toFixed(2)}/100`);
console.log(`Decision: ${complexityResult.decision}`);
console.log(`Should Decompose: ${complexityResult.shouldDecompose ? "Yes" : "No"}\n`);

// 2. 加载 Agent
console.log("─── Step 2: Load Agents ───\n");

const registry = new AgentRegistry({
  projectAgentsDir: path.join(process.cwd(), ".agents"),
  enableHotReload: false,
});

await registry.loadAll();

const claudeAgent = registry.get("claude-opus-coder");
const doubaoAgent = registry.get("doubao-chinese-vision");

if (!claudeAgent || !doubaoAgent) {
  console.error("❌ Required agents not found");
  process.exit(1);
}

console.log("Available Agents:");
console.log(`  - ${claudeAgent.name}: ${claudeAgent.capabilities?.summary}`);
console.log(`  - ${doubaoAgent.name}: ${doubaoAgent.capabilities?.summary}\n`);

// 3. Agent 匹配
console.log("─── Step 3: Agent Matching ───\n");

const agentMatcher = createAgentMatcher([claudeAgent, doubaoAgent]);

// 假设当前是 doubao
const currentAgent = doubaoAgent;
console.log(`Current Agent: ${currentAgent.name}\n`);

const matchResult = agentMatcher.findBestAgent(input, currentAgent, [claudeAgent, doubaoAgent]);

console.log(`Best Match: ${matchResult.bestAgent.name}`);
console.log(`Similarity: ${(matchResult.similarity * 100).toFixed(2)}%`);
console.log(`Should Handoff: ${matchResult.shouldHandoff ? "Yes" : "No"}`);
console.log(`Reasoning: ${matchResult.reasoning}\n`);

// 4. 路由决策
console.log("─── Step 4: Routing Decision ───\n");

let selectedAgent;
let reason;

if (complexityResult.shouldDecompose) {
  selectedAgent = "orchestrator";
  reason = "Complex task - using Orchestrator for decomposition";
} else if (matchResult.shouldHandoff) {
  selectedAgent = matchResult.bestAgent.name;
  reason = `Switching to ${matchResult.bestAgent.name} (better match)`;
} else {
  selectedAgent = currentAgent.name;
  reason = `Keeping current agent ${currentAgent.name}`;
}

console.log(`Decision: ${reason}`);
console.log(`Selected Agent: ${selectedAgent}\n`);

// 5. 问题分析
console.log("─── Step 5: Problem Analysis ───\n");

console.log("Expected Behavior:");
console.log(`  ✅ Task: "写算法" → Should route to claude-opus-coder`);
console.log(`  ✅ Reason: Coding task, algorithm implementation\n`);

console.log("Actual Behavior:");
console.log(`  ${selectedAgent === claudeAgent.name ? "✅" : "❌"} Selected Agent: ${selectedAgent}`);
console.log(`  ${selectedAgent === claudeAgent.name ? "✅" : "❌"} Problem: ${selectedAgent === doubaoAgent.name ? "Task went to doubao instead of claude" : "OK"}\n`);

// 6. 原因分析
console.log("─── Step 6: Root Cause Analysis ───\n");

console.log("Possible Reasons:\n");

console.log("1. Agent Matching Issue:");
console.log(`   - Current similarity: ${(matchResult.similarity * 100).toFixed(2)}%`);
console.log(`   - Minimum absolute similarity: 15%`);
console.log(`   - Minimum improvement: 8%`);
console.log(`   - Should handoff: ${matchResult.shouldHandoff}`);
console.log(`   - Analysis: ${matchResult.similarity >= 0.15 ? "✅ Similarity is high enough" : "❌ Similarity is too low"}\n`);

console.log("2. Agent Capabilities:");
console.log(`   - Claude strengths: ${claudeAgent.capabilities?.modelStrengths.join(", ")}`);
console.log(`   - Doubao strengths: ${doubaoAgent.capabilities?.modelStrengths.join(", ")}`);
console.log(`   - Task keywords: "写", "算法", "正态分布", "随机数"`);
console.log(`   - Match analysis: Should match with "算法实现", "代码生成" in Claude\n`);

console.log("3. TF-IDF Matching:");
console.log(`   - Input: "${input}"`);
console.log(`   - Claude keywords: ${claudeAgent.capabilities?.bestFor?.join(", ")}`);
console.log(`   - Doubao keywords: ${doubaoAgent.capabilities?.bestFor?.join(", ")}`);
console.log(`   - Analysis: Need to check if "算法" matches with Claude's capabilities\n`);

// 7. 建议
console.log("─── Step 7: Recommendations ───\n");

console.log("Potential Solutions:\n");

console.log("1. Improve Agent Capabilities:");
console.log(`   - Add more keywords to Claude's bestFor: ["算法", "算法实现", "数据结构"]`);
console.log(`   - Add more keywords to Claude's modelStrengths: ["算法", "数学", "统计"]\n`);

console.log("2. Adjust Matching Threshold:");
console.log(`   - Minimum absolute similarity: 15%`);
console.log(`   - Minimum improvement: 8%`);
console.log(`   - Status: ✅ Fixed - now uses combined threshold approach\n`);

console.log("3. Add Explicit Rules:");
console.log(`   - If input contains "算法" → route to claude-opus-coder`);
console.log(`   - If input contains "写代码" → route to claude-opus-coder`);
console.log(`   - If input contains "实现" → route to claude-opus-coder\n`);

console.log("4. Improve TF-IDF Vocabulary:");
console.log(`   - Ensure "算法" is in the vocabulary`);
console.log(`   - Ensure "实现" is in the vocabulary`);
console.log(`   - Check IDF scores for these terms\n`);

console.log("─── Analysis Complete ───");
