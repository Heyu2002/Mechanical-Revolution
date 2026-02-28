/**
 * Complete Working Example with Agent Matcher
 *
 * 完整的工作示例，集成：
 * 1. 任务复杂度判断
 * 2. Agent 匹配
 * 3. 实际执行
 */

import {
  defineAgent,
  createComplexityClassifier,
  createAgentMatcher,
  createOrchestratorInstructions,
  handoff,
  Runner,
  createContext,
} from "../src/index.js";

console.log("=== Complete Working Example ===\n");

// ══════════════════════════════════════════════════════════════
// Step 1: 定义专家 Agent（使用你的实际配置）
// ══════════════════════════════════════════════════════════════

const claudeOpusAgent = defineAgent({
  name: "claude-opus-coder",
  instructions: "You are Claude Opus 4, specialized in coding tasks. You excel at implementing algorithms, writing clean code, and solving complex programming problems.",
  provider: "anthropic",
  model: "claude-opus-4-6-kiro",  // 使用你配置的模型
  capabilities: {
    summary: "Claude Opus 4 - 编码能力突出，擅长复杂代码生成",
    modelStrengths: [
      "长代码生成",
      "复杂逻辑处理",
      "架构设计",
      "算法实现",
      "代码重构",
      "二叉树",
      "链表",
      "排序算法",
      "数据结构",
    ],
    taskTypes: [
      "code_writing",
      "debugging",
      "refactoring",
      "architecture_design",
      "algorithm_implementation",
    ],
    languages: ["TypeScript", "Python", "Rust", "Go", "JavaScript"],
    bestFor: [
      "复杂功能实现",
      "大型代码重构",
      "算法优化",
      "数据结构设计",
      "编码",
      "写代码",
      "实现",
      "开发",
    ],
  },
});

const doubaoAgent = defineAgent({
  name: "doubao-chinese-vision",
  instructions: "你是豆包，专注于中文内容处理和图像分析。你擅长理解中文语境，创作中文内容，以及分析图像。",
  provider: "doubao",
  model: "doubao-seed-1-8-251228",  // 使用你配置的模型
  capabilities: {
    summary: "Doubao - 中文理解能力强，擅长中文内容处理和图像分析",
    modelStrengths: [
      "中文语境理解",
      "中文内容创作",
      "文化适配",
      "图像理解和分析",
      "图文结合处理",
      "OCR识别",
    ],
    taskTypes: [
      "chinese_writing",
      "translation",
      "content_creation",
      "image_analysis",
      "image_description",
      "ocr",
    ],
    languages: ["Chinese", "English"],
    bestFor: [
      "中文文案创作",
      "中文内容润色",
      "中英翻译",
      "图像内容分析",
      "图文结合任务",
      "图片文字识别",
      "问候",
      "闲聊",
    ],
  },
});

const allAgents = [claudeOpusAgent, doubaoAgent];

console.log("✓ Defined agents:");
console.log(`  - ${claudeOpusAgent.name} (${claudeOpusAgent.provider}/${claudeOpusAgent.model})`);
console.log(`  - ${doubaoAgent.name} (${doubaoAgent.provider}/${doubaoAgent.model})\n`);

// ══════════════════════════════════════════════════════════════
// Step 2: 创建 Orchestrator
// ══════════════════════════════════════════════════════════════

const orchestratorAgent = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions(allAgents),
  provider: "anthropic",
  model: "claude-opus-4-6-kiro",
  handoffs: [
    handoff(claudeOpusAgent, "Delegate coding tasks to Claude Opus"),
    handoff(doubaoAgent, "Delegate Chinese/image tasks to Doubao"),
  ],
});

console.log("✓ Created orchestrator\n");

// ══════════════════════════════════════════════════════════════
// Step 3: 创建分类器和匹配器
// ══════════════════════════════════════════════════════════════

const complexityClassifier = createComplexityClassifier();
const agentMatcher = createAgentMatcher(allAgents);

console.log("✓ Created classifier and matcher\n");

// ══════════════════════════════════════════════════════════════
// Step 4: 智能路由函数
// ══════════════════════════════════════════════════════════════

function smartRoute(input: string, currentAgent = doubaoAgent) {
  console.log(`\n${"=".repeat(80)}`);
  console.log(`User Input: "${input}"`);
  console.log(`Current Agent: ${currentAgent.name}\n`);

  // 1. 判断复杂度
  const complexityResult = complexityClassifier.classify(input);
  console.log(`Complexity Analysis:`);
  console.log(`  - Score: ${complexityResult.complexity.toFixed(1)}/100`);
  console.log(`  - Decision: ${complexityResult.decision}`);
  console.log(`  - Should Decompose: ${complexityResult.shouldDecompose ? "Yes" : "No"}`);

  // 2. 匹配 Agent
  const matchResult = agentMatcher.findBestAgent(input, currentAgent, allAgents);
  console.log(`\nAgent Matching:`);
  console.log(`  - Best Agent: ${matchResult.bestAgent.name}`);
  console.log(`  - Similarity: ${(matchResult.similarity * 100).toFixed(1)}%`);
  console.log(`  - Should Handoff: ${matchResult.shouldHandoff ? "Yes" : "No"}`);
  console.log(`  - Reasoning: ${matchResult.reasoning}`);

  // 3. 决策
  let selectedAgent;
  let reason;

  if (complexityResult.shouldDecompose) {
    selectedAgent = orchestratorAgent;
    reason = "Complex task - using Orchestrator for decomposition";
  } else if (matchResult.shouldHandoff) {
    selectedAgent = matchResult.bestAgent;
    reason = `Switching to ${matchResult.bestAgent.name} (better match)`;
  } else {
    selectedAgent = currentAgent;
    reason = `Keeping current agent ${currentAgent.name}`;
  }

  console.log(`\n✅ Decision: ${reason}`);
  console.log(`   Selected Agent: ${selectedAgent.name} (${selectedAgent.provider}/${selectedAgent.model})`);
  console.log(`${"=".repeat(80)}\n`);

  return selectedAgent;
}

// ══════════════════════════════════════════════════════════════
// Step 5: 测试用例
// ══════════════════════════════════════════════════════════════

console.log("─── Testing Smart Routing ───");

const testCases = [
  { input: "你好", currentAgent: doubaoAgent },
  { input: "帮我实现一个二叉树遍历算法", currentAgent: doubaoAgent },
  { input: "写一篇关于人工智能的中文文章", currentAgent: claudeOpusAgent },
  { input: "研究 React 19 新特性，然后创建示例组件，并编写测试", currentAgent: doubaoAgent },
];

testCases.forEach(testCase => {
  const selectedAgent = smartRoute(testCase.input, testCase.currentAgent);
});

// ══════════════════════════════════════════════════════════════
// Step 6: 实际运行示例（可选）
// ══════════════════════════════════════════════════════════════

console.log("\n─── Running Actual Example ───\n");

// 加载配置并注册 Provider
import { loadConfig, registerBuiltinProviders } from "../src/index.js";
const config = loadConfig();
registerBuiltinProviders();  // 注册内置 Provider

const runner = new Runner(config);  // 传入配置

async function runExample() {
  const input = "帮我实现一个快速排序算法，用 TypeScript 编写";

  console.log(`Input: "${input}"\n`);

  // 智能路由
  const selectedAgent = smartRoute(input, doubaoAgent);

  console.log("Executing with selected agent...\n");

  try {
    const context = createContext();
    const result = await runner.run(selectedAgent, input, context);

    console.log("\n─── Result ───\n");
    console.log(result.output);
    console.log(`\nLast Agent: ${result.lastAgent}`);
  } catch (error) {
    console.error("Error:", error);
  }
}

// 运行示例
runExample().then(() => {
  console.log("\n─── Example Complete ───");
}).catch(error => {
  console.error("Fatal error:", error);
});
