/**
 * Test TF-IDF Agent Matcher
 *
 * 测试基于 TF-IDF 的 Agent 匹配功能
 */

import {
  defineAgent,
  createAgentMatcher,
  type AgentConfig,
} from "../src/index.js";

console.log("=== TF-IDF Agent Matcher Test ===\n");

// ── 定义测试 Agent ──

const claudeOpusAgent = defineAgent({
  name: "claude-opus-coder",
  instructions: "You are Claude Opus 4, specialized in coding.",
  provider: "anthropic",
  model: "claude-opus-4-20250514",
  capabilities: {
    summary: "Claude Opus 4 - 编码能力突出，擅长复杂代码生成",
    modelStrengths: [
      "长代码生成",
      "复杂逻辑处理",
      "架构设计",
      "算法实现",
      "代码重构",
    ],
    taskTypes: [
      "code_writing",
      "debugging",
      "refactoring",
      "architecture_design",
      "algorithm_implementation",
    ],
    languages: [
      "TypeScript",
      "Python",
      "Rust",
      "Go",
      "JavaScript",
    ],
    bestFor: [
      "复杂功能实现",
      "大型代码重构",
      "算法优化",
      "数据结构设计",
      "二叉树",
      "链表",
      "排序算法",
    ],
    limitations: [
      "不能执行 web 搜索",
      "不能进行复杂数学证明",
    ],
  },
});

const claudeSonnetAgent = defineAgent({
  name: "claude-sonnet-analyst",
  instructions: "You are Claude Sonnet 4, specialized in analysis and reasoning.",
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  capabilities: {
    summary: "Claude Sonnet 4 - 推理和分析能力强，擅长问题分解和数据分析",
    modelStrengths: [
      "逻辑推理",
      "问题分解",
      "数据分析",
      "信息综合",
      "统计计算",
    ],
    taskTypes: [
      "research",
      "analysis",
      "reasoning",
      "calculation",
      "data_processing",
    ],
    languages: [
      "English",
      "Chinese",
    ],
    bestFor: [
      "复杂问题分析",
      "数据统计计算",
      "信息检索和综合",
      "逻辑推理",
      "数学计算",
    ],
    limitations: [
      "代码生成能力不如 Claude Opus",
    ],
  },
});

const doubaoAgent = defineAgent({
  name: "doubao-chinese-vision",
  instructions: "你是豆包，专注于中文内容处理和图像分析。",
  provider: "doubao",
  model: "doubao-seed-2-0-pro-260215",
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
    languages: [
      "Chinese",
      "English",
    ],
    bestFor: [
      "中文文案创作",
      "中文内容润色",
      "中英翻译",
      "图像内容分析",
      "图文结合任务",
      "图片文字识别",
    ],
    limitations: [
      "编码能力相对较弱",
      "复杂逻辑推理不如 Claude Sonnet",
      "图像生成能力有限（主要是理解和分析）",
    ],
  },
});

const allAgents = [claudeOpusAgent, claudeSonnetAgent, doubaoAgent];

console.log("✓ Defined 3 agents with capabilities\n");

// ── 创建 Agent Matcher ──

const matcher = createAgentMatcher(allAgents);

console.log("─── Agent Matcher Statistics ───\n");
const stats = matcher.getStats();
console.log(`Vocabulary Size: ${stats.vocabularySize}`);
console.log(`Agent Count: ${stats.agentCount}`);
console.log(`Vector Dimension: ${stats.vectorDimension}`);
console.log("\nAgents:");
stats.agents.forEach(a => {
  console.log(`  - ${a.name}: ${a.hasVector ? "✓" : "✗"}`);
});
console.log();

// ── 测试用例 ──

interface TestCase {
  input: string;
  currentAgent: AgentConfig;
  expectedBestAgent: string;
  description: string;
}

const testCases: TestCase[] = [
  {
    input: "帮我设计一个二叉树遍历算法",
    currentAgent: doubaoAgent,
    expectedBestAgent: "claude-opus-coder",
    description: "编码任务 - 应该切换到 Claude Opus",
  },
  {
    input: "实现一个快速排序算法，用 TypeScript 编写",
    currentAgent: claudeSonnetAgent,
    expectedBestAgent: "claude-opus-coder",
    description: "编码任务 - 应该切换到 Claude Opus",
  },
  {
    input: "分析这张图片中的文字内容",
    currentAgent: claudeOpusAgent,
    expectedBestAgent: "doubao-chinese-vision",
    description: "图像任务 - 应该切换到 Doubao",
  },
  {
    input: "识别图片中的中文文字并翻译成英文",
    currentAgent: claudeSonnetAgent,
    expectedBestAgent: "doubao-chinese-vision",
    description: "图像+中文任务 - 应该切换到 Doubao",
  },
  {
    input: "写一篇关于人工智能发展的中文文章",
    currentAgent: claudeOpusAgent,
    expectedBestAgent: "doubao-chinese-vision",
    description: "中文写作任务 - 应该切换到 Doubao",
  },
  {
    input: "计算这个数据集的平均值和标准差",
    currentAgent: doubaoAgent,
    expectedBestAgent: "claude-sonnet-analyst",
    description: "数据分析任务 - 应该切换到 Claude Sonnet",
  },
  {
    input: "优化这段 TypeScript 代码的性能",
    currentAgent: claudeOpusAgent,
    expectedBestAgent: "claude-opus-coder",
    description: "编码任务 - 保持当前 Agent",
  },
  {
    input: "润色这段中文文案，使其更加优雅",
    currentAgent: doubaoAgent,
    expectedBestAgent: "doubao-chinese-vision",
    description: "中文任务 - 保持当前 Agent",
  },
];

console.log("─── Test Cases ───\n");

let passCount = 0;
let failCount = 0;

for (let i = 0; i < testCases.length; i++) {
  const testCase = testCases[i];
  console.log(`Test ${i + 1}: ${testCase.description}`);
  console.log(`Input: "${testCase.input}"`);
  console.log(`Current Agent: ${testCase.currentAgent.name}`);

  // 分析输入特征
  const inputAnalysis = matcher.analyzeInput(testCase.input);
  console.log(`\nInput Analysis:`);
  console.log(`  - Token Count: ${inputAnalysis.tokenCount}`);
  console.log(`  - Unique Tokens: ${inputAnalysis.uniqueTokenCount}`);
  console.log(`  - Chinese Char Ratio: ${(inputAnalysis.chineseCharRatio * 100).toFixed(1)}%`);
  console.log(`  - Top Tokens: ${inputAnalysis.topTokens.slice(0, 5).map(t => t.token).join(", ")}`);

  // 执行匹配
  const result = matcher.findBestAgent(
    testCase.input,
    testCase.currentAgent,
    allAgents
  );

  console.log(`\nMatch Result:`);
  console.log(`  - Best Agent: ${result.bestAgent.name}`);
  console.log(`  - Similarity: ${(result.similarity * 100).toFixed(1)}%`);
  console.log(`  - Should Handoff: ${result.shouldHandoff ? "Yes" : "No"}`);
  console.log(`  - Reasoning: ${result.reasoning}`);

  console.log(`\nAll Scores:`);
  result.allScores.forEach(score => {
    console.log(`  - ${score.agent}: ${(score.similarity * 100).toFixed(1)}%`);
  });

  // 验证结果
  const passed = result.bestAgent.name === testCase.expectedBestAgent;
  if (passed) {
    console.log(`\n✅ PASSED`);
    passCount++;
  } else {
    console.log(`\n❌ FAILED - Expected: ${testCase.expectedBestAgent}, Got: ${result.bestAgent.name}`);
    failCount++;
  }

  console.log("\n" + "─".repeat(80) + "\n");
}

// ── 测试总结 ──

console.log("─── Test Summary ───\n");
console.log(`Total: ${testCases.length}`);
console.log(`Passed: ${passCount} (${((passCount / testCases.length) * 100).toFixed(1)}%)`);
console.log(`Failed: ${failCount} (${((failCount / testCases.length) * 100).toFixed(1)}%)`);

if (passCount === testCases.length) {
  console.log("\n🎉 All tests passed!");
} else {
  console.log(`\n⚠️  ${failCount} test(s) failed`);
}

console.log("\n─── Additional Tests ───\n");

// 测试边界情况
console.log("Test: Empty input");
try {
  const result = matcher.findBestAgent("", claudeOpusAgent, allAgents);
  console.log(`Result: ${result.bestAgent.name} (similarity: ${(result.similarity * 100).toFixed(1)}%)`);
} catch (error) {
  console.log(`Error: ${error}`);
}

console.log("\nTest: Very short input");
const shortResult = matcher.findBestAgent("你好", claudeOpusAgent, allAgents);
console.log(`Result: ${shortResult.bestAgent.name} (similarity: ${(shortResult.similarity * 100).toFixed(1)}%)`);
console.log(`Reasoning: ${shortResult.reasoning}`);

console.log("\nTest: Mixed language input");
const mixedResult = matcher.findBestAgent(
  "用 Python 实现一个机器学习模型",
  doubaoAgent,
  allAgents
);
console.log(`Result: ${mixedResult.bestAgent.name} (similarity: ${(mixedResult.similarity * 100).toFixed(1)}%)`);
console.log(`Should Handoff: ${mixedResult.shouldHandoff}`);
console.log(`Reasoning: ${mixedResult.reasoning}`);

console.log("\n─── Test Complete ───");
