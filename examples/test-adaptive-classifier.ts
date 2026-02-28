/**
 * Test Adaptive Task Complexity Classifier
 *
 * 测试具有学习能力的任务复杂度分类器
 */

import { createAdaptiveClassifier } from "../src/index.js";
import * as fs from "fs";
import * as path from "path";

console.log("=== Adaptive Task Complexity Classifier Test ===\n");

// 清理旧数据
const dataDir = path.join(process.cwd(), "data");
if (fs.existsSync(dataDir)) {
  fs.rmSync(dataDir, { recursive: true });
}

// 创建自适应分类器
const classifier = createAdaptiveClassifier();

console.log("✓ Created adaptive classifier\n");

// ══════════════════════════════════════════════════════════════
// Step 1: 添加标注样本
// ══════════════════════════════════════════════════════════════

console.log("─── Step 1: Adding Labeled Training Samples ───\n");

const labeledSamples = [
  // 闲聊样本
  { input: "你好", actualDecision: "chitchat" as const },
  { input: "今天天气真好", actualDecision: "chitchat" as const },
  { input: "谢谢", actualDecision: "chitchat" as const },
  { input: "再见", actualDecision: "chitchat" as const },
  { input: "哈哈", actualDecision: "chitchat" as const },

  // 简单查询样本
  { input: "什么是 React？", actualDecision: "simple_query" as const },
  { input: "TypeScript 和 JavaScript 有什么区别？", actualDecision: "simple_query" as const },
  { input: "如何安装 Node.js？", actualDecision: "simple_query" as const },
  { input: "Python 的优势是什么？", actualDecision: "simple_query" as const },
  { input: "什么是机器学习？", actualDecision: "simple_query" as const },

  // 中等任务样本
  { input: "帮我实现一个二叉树遍历算法", actualDecision: "medium_task" as const },
  { input: "写一篇关于人工智能的中文文章", actualDecision: "medium_task" as const },
  { input: "分析这张图片中的文字内容", actualDecision: "medium_task" as const },
  { input: "计算这个数据集的平均值和标准差", actualDecision: "medium_task" as const },
  { input: "优化这段 TypeScript 代码的性能", actualDecision: "medium_task" as const },
  { input: "翻译这段英文文档成中文", actualDecision: "medium_task" as const },
  { input: "设计一个用户登录界面", actualDecision: "medium_task" as const },

  // 复杂任务样本
  { input: "研究 React 19 的新特性，然后创建示例组件，并编写测试用例", actualDecision: "complex_task" as const },
  { input: "首先分析这个数据集的统计特征，然后用 Python 实现机器学习模型，最后生成可视化报告", actualDecision: "complex_task" as const },
  { input: "实现一个完整的用户认证系统，包括注册、登录、密码重置功能，使用 TypeScript 和 React，需要支持 JWT 认证，并且要有完整的单元测试", actualDecision: "complex_task" as const },
  { input: "调研市场上的竞品，分析他们的优缺点，然后设计我们的产品方案，并制定开发计划", actualDecision: "complex_task" as const },
  { input: "阅读这篇论文，总结核心观点，然后用 Python 复现实验，最后写一份技术报告", actualDecision: "complex_task" as const },
];

classifier.addLabeledSamples(labeledSamples);

console.log(`Added ${labeledSamples.length} labeled samples\n`);

// ══════════════════════════════════════════════════════════════
// Step 2: 训练前的性能
// ══════════════════════════════════════════════════════════════

console.log("─── Step 2: Performance Before Training ───\n");

const statsBefore = classifier.getStats();
console.log(`Total Samples: ${statsBefore.totalSamples}`);
console.log(`Labeled Samples: ${statsBefore.labeledSamples}`);
console.log(`Accuracy: ${(statsBefore.accuracy * 100).toFixed(1)}%`);
console.log(`\nWeights Before Training:`);
console.log(`  α1 (Linguistic): ${statsBefore.weights.α1.toFixed(3)}`);
console.log(`  α2 (Structural): ${statsBefore.weights.α2.toFixed(3)}`);
console.log(`  α3 (Contextual): ${statsBefore.weights.α3.toFixed(3)}`);
console.log(`  α4 (Semantic): ${statsBefore.weights.α4.toFixed(3)}`);
console.log(`  β (Bias): ${statsBefore.weights.β.toFixed(3)}\n`);

// ══════════════════════════════════════════════════════════════
// Step 3: 训练模型
// ══════════════════════════════════════════════════════════════

console.log("─── Step 3: Training Model ───\n");

const learningStats = classifier.train(100);

// ══════════════════════════════════════════════════════════════
// Step 4: 训练后的性能
// ══════════════════════════════════════════════════════════════

console.log("─── Step 4: Performance After Training ───\n");

const statsAfter = classifier.getStats();
console.log(`Accuracy: ${(statsAfter.accuracy * 100).toFixed(1)}%`);
console.log(`Improvement: ${((statsAfter.accuracy - statsBefore.accuracy) * 100).toFixed(1)}%\n`);

// ══════════════════════════════════════════════════════════════
// Step 5: 测试新样本
// ══════════════════════════════════════════════════════════════

console.log("─── Step 5: Testing on New Samples ───\n");

const testSamples = [
  { input: "嗨", expected: "chitchat" },
  { input: "什么是深度学习？", expected: "simple_query" },
  { input: "帮我写一个快速排序算法", expected: "medium_task" },
  { input: "先研究用户需求，然后设计原型，接着开发实现，最后进行测试和部署", expected: "complex_task" },
];

let correctCount = 0;

testSamples.forEach((test, index) => {
  const result = classifier.classify(test.input);
  const correct = result.decision === test.expected;

  console.log(`Test ${index + 1}: "${test.input}"`);
  console.log(`  Complexity: ${result.complexity.toFixed(1)}`);
  console.log(`  Predicted: ${result.decision}`);
  console.log(`  Expected: ${test.expected}`);
  console.log(`  ${correct ? "✅ CORRECT" : "❌ WRONG"}\n`);

  if (correct) correctCount++;
});

console.log(`Test Accuracy: ${(correctCount / testSamples.length * 100).toFixed(1)}%\n`);

// ══════════════════════════════════════════════════════════════
// Step 6: 展示学习曲线
// ══════════════════════════════════════════════════════════════

console.log("─── Step 6: Learning Curve ───\n");

console.log("Loss History:");
learningStats.weightHistory.forEach((entry, index) => {
  if (index % 2 === 0) {  // 每隔一个显示
    const normalizedLoss = Math.min(entry.loss / 100, 1);  // 归一化到 [0, 1]
    const bar = "█".repeat(Math.max(0, Math.floor((1 - normalizedLoss) * 20)));
    console.log(`  Epoch ${index * 10 + 1}: ${entry.loss.toFixed(4)} ${bar}`);
  }
});

console.log("\nAccuracy History:");
learningStats.accuracyHistory.forEach((entry, index) => {
  if (index % 2 === 0) {
    const bar = "█".repeat(Math.floor(entry.accuracy * 20));
    console.log(`  Epoch ${index * 10 + 1}: ${(entry.accuracy * 100).toFixed(1)}% ${bar}`);
  }
});

// ══════════════════════════════════════════════════════════════
// Step 7: 权重变化
// ══════════════════════════════════════════════════════════════

console.log("\n─── Step 7: Weight Changes ───\n");

const firstWeights = learningStats.weightHistory[0].weights;
const lastWeights = learningStats.weightHistory[learningStats.weightHistory.length - 1].weights;

console.log("Weight Changes:");
console.log(`  α1: ${firstWeights.α1.toFixed(3)} → ${lastWeights.α1.toFixed(3)} (${((lastWeights.α1 - firstWeights.α1) * 100).toFixed(1)}%)`);
console.log(`  α2: ${firstWeights.α2.toFixed(3)} → ${lastWeights.α2.toFixed(3)} (${((lastWeights.α2 - firstWeights.α2) * 100).toFixed(1)}%)`);
console.log(`  α3: ${firstWeights.α3.toFixed(3)} → ${lastWeights.α3.toFixed(3)} (${((lastWeights.α3 - firstWeights.α3) * 100).toFixed(1)}%)`);
console.log(`  α4: ${firstWeights.α4.toFixed(3)} → ${lastWeights.α4.toFixed(3)} (${((lastWeights.α4 - firstWeights.α4) * 100).toFixed(1)}%)`);
console.log(`  β: ${firstWeights.β.toFixed(3)} → ${lastWeights.β.toFixed(3)} (${((lastWeights.β - firstWeights.β)).toFixed(1)})`);

// ══════════════════════════════════════════════════════════════
// Step 8: 在线学习演示
// ══════════════════════════════════════════════════════════════

console.log("\n─── Step 8: Online Learning Demo ───\n");

console.log("Simulating online learning with user feedback...\n");

// 模拟用户使用并提供反馈
const onlineSamples = [
  { input: "帮我debug这段代码", expected: "medium_task" as const },
  { input: "你能做什么？", expected: "simple_query" as const },
  { input: "设计一个电商系统，包括前端、后端、数据库，并部署到云端", expected: "complex_task" as const },
];

onlineSamples.forEach((sample, index) => {
  // 用户输入
  const result = classifier.classifyAndRecord(sample.input);

  console.log(`User Input ${index + 1}: "${sample.input}"`);
  console.log(`  Predicted: ${result.decision} (${result.complexity.toFixed(1)})`);

  // 模拟用户反馈（纠正错误）
  const sampleIndex = classifier.getTrainingSamples().length - 1;
  classifier.updateSampleLabel(sampleIndex, sample.expected);

  console.log(`  User Feedback: ${sample.expected}`);
  console.log(`  ✓ Label updated\n`);
});

console.log("Online learning will automatically adjust weights based on feedback.\n");

// ══════════════════════════════════════════════════════════════
// Summary
// ══════════════════════════════════════════════════════════════

console.log("─── Summary ───\n");

console.log("✅ Adaptive Learning Features:");
console.log("  1. Record training samples with labels");
console.log("  2. Train model using gradient descent");
console.log("  3. Automatically adjust weights based on data");
console.log("  4. Support online learning with user feedback");
console.log("  5. Persist samples and weights to disk");
console.log("  6. Track learning progress and accuracy");

console.log("\n💡 Key Advantages:");
console.log("  - Weights are NOT fixed - they adapt to real data");
console.log("  - Continuous improvement as more samples are collected");
console.log("  - User feedback directly improves model accuracy");
console.log("  - Learning history is preserved across sessions");

console.log("\n📊 Results:");
console.log(`  - Initial Accuracy: ${(statsBefore.accuracy * 100).toFixed(1)}%`);
console.log(`  - Final Accuracy: ${(statsAfter.accuracy * 100).toFixed(1)}%`);
console.log(`  - Improvement: ${((statsAfter.accuracy - statsBefore.accuracy) * 100).toFixed(1)}%`);
console.log(`  - Training Samples: ${statsAfter.totalSamples}`);

console.log("\n─── Test Complete ───");
