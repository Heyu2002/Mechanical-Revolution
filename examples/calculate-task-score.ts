/**
 * Calculate Task Complexity Score
 *
 * 使用回归方程计算任务复杂度得分
 */

import { createComplexityClassifier } from "../src/index.js";

console.log("=== Task Complexity Score Calculation ===\n");

// 创建复杂度分类器
const classifier = createComplexityClassifier();

// 测试输入
const input = "帮我写一个满足正态分布的随机数算法";

console.log(`Input: "${input}"\n`);

// 分类
const result = classifier.classify(input);

console.log("─── Complexity Analysis ───\n");

console.log(`Overall Score: ${result.complexity.toFixed(2)}/100`);
console.log(`Decision: ${result.decision}`);
console.log(`Should Decompose: ${result.shouldDecompose ? "Yes" : "No"}\n`);

console.log("─── Feature Breakdown ───\n");

// 使用 breakdown 而不是 features 中的嵌套对象
console.log(`Linguistic Score (L): ${result.breakdown.linguistic.toFixed(2)}`);
console.log(`  - Action verb score: ${result.features.linguistic.actionVerbScore.toFixed(2)}`);
console.log(`  - Goal word score: ${result.features.linguistic.goalWordScore.toFixed(2)}`);
console.log(`  - Complexity score: ${result.features.linguistic.complexityScore.toFixed(2)}`);
console.log(`  - Length score: ${result.features.linguistic.lengthScore.toFixed(2)}`);
console.log(`  - Tech score: ${result.features.linguistic.techScore.toFixed(2)}\n`);

console.log(`Structural Score (S): ${result.breakdown.structural.toFixed(2)}`);
console.log(`  - Step score: ${result.features.structural.stepScore.toFixed(2)}`);
console.log(`  - Domain score: ${result.features.structural.domainScore.toFixed(2)}`);
console.log(`  - Constraint score: ${result.features.structural.constraintScore.toFixed(2)}`);
console.log(`  - Output score: ${result.features.structural.outputScore.toFixed(2)}\n`);

console.log(`Contextual Score (C): ${result.breakdown.contextual.toFixed(2)}`);
console.log(`  - Task state score: ${result.features.contextual.taskStateScore.toFixed(2)}`);
console.log(`  - Relevance score: ${result.features.contextual.relevanceScore.toFixed(2)}`);
console.log(`  - History score: ${result.features.contextual.historyScore.toFixed(2)}\n`);

console.log(`Semantic Score (M): ${result.breakdown.semantic.toFixed(2)}`);
console.log(`  - Intent score: ${result.features.semantic.intentScore.toFixed(2)}`);
console.log(`  - Completeness score: ${result.features.semantic.completenessScore.toFixed(2)}`);
console.log(`  - Professional score: ${result.features.semantic.professionalScore.toFixed(2)}\n`);

console.log("─── Regression Equation ───\n");

// 获取权重
const weights = classifier.getWeights();

console.log("Formula:");
console.log(`  Complexity = α₁·L + α₂·S + α₃·C + α₄·M + β`);
console.log();
console.log("Weights:");
console.log(`  α₁ (Linguistic):  ${weights.α1.toFixed(3)}`);
console.log(`  α₂ (Structural):  ${weights.α2.toFixed(3)}`);
console.log(`  α₃ (Contextual):  ${weights.α3.toFixed(3)}`);
console.log(`  α₄ (Semantic):    ${weights.α4.toFixed(3)}`);
console.log(`  β  (Bias):        ${weights.β.toFixed(3)}`);
console.log();

console.log("Calculation:");
console.log(`  Complexity = ${weights.α1.toFixed(3)} × ${result.breakdown.linguistic.toFixed(2)} + ` +
            `${weights.α2.toFixed(3)} × ${result.breakdown.structural.toFixed(2)} + ` +
            `${weights.α3.toFixed(3)} × ${result.breakdown.contextual.toFixed(2)} + ` +
            `${weights.α4.toFixed(3)} × ${result.breakdown.semantic.toFixed(2)} + ` +
            `${weights.β.toFixed(3)}`);

const calculated =
  weights.α1 * result.breakdown.linguistic +
  weights.α2 * result.breakdown.structural +
  weights.α3 * result.breakdown.contextual +
  weights.α4 * result.breakdown.semantic +
  weights.β;

console.log(`             = ${(weights.α1 * result.breakdown.linguistic).toFixed(2)} + ` +
            `${(weights.α2 * result.breakdown.structural).toFixed(2)} + ` +
            `${(weights.α3 * result.breakdown.contextual).toFixed(2)} + ` +
            `${(weights.α4 * result.breakdown.semantic).toFixed(2)} + ` +
            `${weights.β.toFixed(2)}`);

console.log(`             = ${calculated.toFixed(2)}`);
console.log();

console.log("─── Decision Thresholds ───\n");

console.log("Thresholds:");
console.log(`  chitchat:      < 25`);
console.log(`  simple_query:  25 - 35`);
console.log(`  medium_task:   35 - 50`);
console.log(`  complex_task:  >= 50`);
console.log();

console.log(`Result: ${result.complexity.toFixed(2)} → ${result.decision}`);
console.log();

console.log("─── Interpretation ───\n");

if (result.decision === "chitchat") {
  console.log("This is a simple greeting or casual conversation.");
  console.log("Recommendation: Handle directly with current agent.");
} else if (result.decision === "simple_query") {
  console.log("This is a straightforward question or simple request.");
  console.log("Recommendation: Handle directly with current agent.");
} else if (result.decision === "medium_task") {
  console.log("This is a moderate complexity task requiring some work.");
  console.log("Recommendation: Assign to appropriate specialist agent.");
} else if (result.decision === "complex_task") {
  console.log("This is a complex task requiring multiple steps or expertise.");
  console.log("Recommendation: Use orchestrator for task decomposition.");
}

console.log();
console.log("─── Analysis Complete ───");
