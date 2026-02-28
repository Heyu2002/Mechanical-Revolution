/**
 * Test Task Complexity Classifier
 *
 * 测试基于回归方程的任务复杂度分类
 */

import { createComplexityClassifier } from "../src/index.js";

console.log("=== Task Complexity Classifier Test ===\n");

const classifier = createComplexityClassifier();

console.log("✓ Created complexity classifier\n");
console.log("Weights:");
const weights = classifier.getWeights();
console.log(`  α1 (Linguistic): ${weights.α1}`);
console.log(`  α2 (Structural): ${weights.α2}`);
console.log(`  α3 (Contextual): ${weights.α3}`);
console.log(`  α4 (Semantic): ${weights.α4}`);
console.log(`  β (Bias): ${weights.β}\n`);

// ── 测试用例 ──

interface TestCase {
  input: string;
  expectedDecision: "chitchat" | "simple_query" | "medium_task" | "complex_task";
  description: string;
}

const testCases: TestCase[] = [
  {
    input: "你好",
    expectedDecision: "chitchat",
    description: "简单问候",
  },
  {
    input: "今天天气真好啊",
    expectedDecision: "chitchat",
    description: "闲聊",
  },
  {
    input: "什么是 React？",
    expectedDecision: "simple_query",
    description: "简单查询",
  },
  {
    input: "TypeScript 和 JavaScript 有什么区别？",
    expectedDecision: "simple_query",
    description: "对比查询",
  },
  {
    input: "帮我实现一个二叉树遍历算法",
    expectedDecision: "medium_task",
    description: "中等编码任务",
  },
  {
    input: "写一篇关于人工智能的中文文章",
    expectedDecision: "medium_task",
    description: "中等写作任务",
  },
  {
    input: "分析这张图片中的文字内容",
    expectedDecision: "medium_task",
    description: "中等图像任务",
  },
  {
    input: "研究 React 19 的新特性，然后创建示例组件，并编写测试用例",
    expectedDecision: "complex_task",
    description: "复杂任务 - 多步骤",
  },
  {
    input: "首先分析这个数据集的统计特征，然后用 Python 实现机器学习模型，最后生成可视化报告",
    expectedDecision: "complex_task",
    description: "复杂任务 - 跨领域多步骤",
  },
  {
    input: "实现一个完整的用户认证系统，包括注册、登录、密码重置功能，使用 TypeScript 和 React，需要支持 JWT 认证，并且要有完整的单元测试",
    expectedDecision: "complex_task",
    description: "复杂任务 - 多约束条件",
  },
];

console.log("─── Test Cases ───\n");

let passCount = 0;
let failCount = 0;

for (let i = 0; i < testCases.length; i++) {
  const testCase = testCases[i];
  console.log(`Test ${i + 1}: ${testCase.description}`);
  console.log(`Input: "${testCase.input}"`);

  const result = classifier.classify(testCase.input);

  console.log(`\nResult:`);
  console.log(`  - Complexity: ${result.complexity.toFixed(1)}/100`);
  console.log(`  - Decision: ${result.decision}`);
  console.log(`  - Should Decompose: ${result.shouldDecompose ? "Yes" : "No"}`);
  console.log(`  - Reasoning: ${result.reasoning}`);

  console.log(`\nBreakdown:`);
  console.log(`  - Linguistic: ${result.breakdown.linguistic.toFixed(1)}`);
  console.log(`  - Structural: ${result.breakdown.structural.toFixed(1)}`);
  console.log(`  - Contextual: ${result.breakdown.contextual.toFixed(1)}`);
  console.log(`  - Semantic: ${result.breakdown.semantic.toFixed(1)}`);

  console.log(`\nDetailed Features:`);
  console.log(`  Linguistic:`);
  console.log(`    - Action Verbs: ${result.features.linguistic.actionVerbScore.toFixed(1)}`);
  console.log(`    - Goal Words: ${result.features.linguistic.goalWordScore.toFixed(1)}`);
  console.log(`    - Complexity Indicators: ${result.features.linguistic.complexityScore.toFixed(1)}`);
  console.log(`    - Length: ${result.features.linguistic.lengthScore.toFixed(1)}`);
  console.log(`    - Tech Terms: ${result.features.linguistic.techScore.toFixed(1)}`);

  console.log(`  Structural:`);
  console.log(`    - Steps: ${result.features.structural.stepScore.toFixed(1)}`);
  console.log(`    - Domains: ${result.features.structural.domainScore.toFixed(1)}`);
  console.log(`    - Constraints: ${result.features.structural.constraintScore.toFixed(1)}`);
  console.log(`    - Output: ${result.features.structural.outputScore.toFixed(1)}`);

  // 验证结果
  const passed = result.decision === testCase.expectedDecision;
  if (passed) {
    console.log(`\n✅ PASSED`);
    passCount++;
  } else {
    console.log(`\n❌ FAILED - Expected: ${testCase.expectedDecision}, Got: ${result.decision}`);
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

// ── 复杂度分布分析 ──

console.log("\n─── Complexity Distribution ───\n");

const complexities = testCases.map(tc => ({
  input: tc.input.substring(0, 40) + (tc.input.length > 40 ? "..." : ""),
  complexity: classifier.classify(tc.input).complexity,
  decision: classifier.classify(tc.input).decision,
}));

complexities.sort((a, b) => a.complexity - b.complexity);

console.log("Sorted by complexity (low to high):\n");
complexities.forEach((item, index) => {
  const bar = "█".repeat(Math.floor(item.complexity / 5));
  console.log(`${index + 1}. [${item.complexity.toFixed(1).padStart(5)}] ${bar} ${item.decision.padEnd(15)} "${item.input}"`);
});

// ── 阈值分析 ──

console.log("\n─── Threshold Analysis ───\n");

const decisions = {
  chitchat: complexities.filter(c => c.decision === "chitchat"),
  simple_query: complexities.filter(c => c.decision === "simple_query"),
  medium_task: complexities.filter(c => c.decision === "medium_task"),
  complex_task: complexities.filter(c => c.decision === "complex_task"),
};

console.log("Decision ranges:");
Object.entries(decisions).forEach(([decision, items]) => {
  if (items.length > 0) {
    const min = Math.min(...items.map(i => i.complexity));
    const max = Math.max(...items.map(i => i.complexity));
    const avg = items.reduce((sum, i) => sum + i.complexity, 0) / items.length;
    console.log(`  ${decision.padEnd(15)}: [${min.toFixed(1)} - ${max.toFixed(1)}], avg: ${avg.toFixed(1)}`);
  }
});

console.log("\nThresholds:");
console.log("  chitchat       : complexity < 18");
console.log("  simple_query   : 18 ≤ complexity < 30");
console.log("  medium_task    : 30 ≤ complexity < 48");
console.log("  complex_task   : complexity ≥ 48");
console.log("  should_decompose: complexity ≥ 48");

console.log("\n─── Test Complete ───");
