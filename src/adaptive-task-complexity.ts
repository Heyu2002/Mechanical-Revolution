/**
 * Adaptive Task Complexity Classifier with Learning
 *
 * 具有学习能力的任务复杂度分类器
 * - 记录历史任务和真实标签
 * - 使用梯度下降优化权重
 * - 支持在线学习和批量学习
 */

import type { AgentContext } from "./types.js";
import { TaskComplexityClassifier, type TaskComplexityResult, type TaskFeatures } from "./task-complexity.js";
import * as fs from "fs";
import * as path from "path";

/**
 * 训练样本
 */
export interface TrainingSample {
  input: string;
  features: TaskFeatures;
  predictedComplexity: number;
  actualComplexity: number;  // 真实复杂度（用户反馈或人工标注）
  actualDecision: "chitchat" | "simple_query" | "medium_task" | "complex_task";
  timestamp: number;
  context?: AgentContext;
}

/**
 * 学习统计
 */
export interface LearningStats {
  totalSamples: number;
  averageLoss: number;
  weightHistory: Array<{
    timestamp: number;
    weights: Record<string, number>;
    loss: number;
  }>;
  accuracyHistory: Array<{
    timestamp: number;
    accuracy: number;
  }>;
}

/**
 * 具有学习能力的任务复杂度分类器
 */
export class AdaptiveTaskComplexityClassifier extends TaskComplexityClassifier {
  private trainingSamples: TrainingSample[] = [];
  private learningRate = 0.001;  // 降低学习率（从 0.01 到 0.001）
  private maxSamples = 1000;    // 最大保存样本数
  private minSamplesForTraining = 10;  // 最少训练样本数
  private trainingInterval = 10;  // 每收集 N 个样本训练一次
  private storageFile: string;

  constructor(storageFile?: string) {
    super();
    this.storageFile = storageFile || path.join(process.cwd(), "data", "training-samples.json");
    this.loadTrainingSamples();
  }

  /**
   * 分类并记录（用于在线学习）
   */
  classifyAndRecord(
    input: string,
    context?: AgentContext
  ): TaskComplexityResult {
    const result = this.classify(input, context);

    // 记录预测（等待用户反馈）
    const sample: TrainingSample = {
      input,
      features: result.features,
      predictedComplexity: result.complexity,
      actualComplexity: result.complexity,  // 初始值，等待更新
      actualDecision: result.decision,
      timestamp: Date.now(),
      context,
    };

    this.trainingSamples.push(sample);

    // 限制样本数量（FIFO）
    if (this.trainingSamples.length > this.maxSamples) {
      this.trainingSamples.shift();
    }

    // 定期训练
    if (this.trainingSamples.length % this.trainingInterval === 0) {
      this.trainOnRecentSamples();
    }

    return result;
  }

  /**
   * 更新样本的真实标签（用户反馈）
   */
  updateSampleLabel(
    sampleIndex: number,
    actualDecision: TrainingSample["actualDecision"],
    actualComplexity?: number
  ) {
    if (sampleIndex < 0 || sampleIndex >= this.trainingSamples.length) {
      throw new Error(`Invalid sample index: ${sampleIndex}`);
    }

    const sample = this.trainingSamples[sampleIndex];

    // 更新真实标签
    sample.actualDecision = actualDecision;

    // 如果没有提供真实复杂度，根据决策推断
    if (actualComplexity !== undefined) {
      sample.actualComplexity = actualComplexity;
    } else {
      sample.actualComplexity = this.decisionToComplexity(actualDecision);
    }

    // 保存到文件
    this.saveTrainingSamples();
  }

  /**
   * 批量添加标注样本
   */
  addLabeledSamples(samples: Array<{
    input: string;
    actualDecision: TrainingSample["actualDecision"];
    actualComplexity?: number;
    context?: AgentContext;
  }>) {
    for (const sample of samples) {
      const result = this.classify(sample.input, sample.context);

      const trainingSample: TrainingSample = {
        input: sample.input,
        features: result.features,
        predictedComplexity: result.complexity,
        actualComplexity: sample.actualComplexity ?? this.decisionToComplexity(sample.actualDecision),
        actualDecision: sample.actualDecision,
        timestamp: Date.now(),
        context: sample.context,
      };

      this.trainingSamples.push(trainingSample);
    }

    // 限制样本数量
    if (this.trainingSamples.length > this.maxSamples) {
      this.trainingSamples = this.trainingSamples.slice(-this.maxSamples);
    }

    this.saveTrainingSamples();
  }

  /**
   * 训练模型（梯度下降）
   */
  train(epochs: number = 100): LearningStats {
    if (this.trainingSamples.length < this.minSamplesForTraining) {
      throw new Error(`Not enough training samples. Need at least ${this.minSamplesForTraining}, got ${this.trainingSamples.length}`);
    }

    const stats: LearningStats = {
      totalSamples: this.trainingSamples.length,
      averageLoss: 0,
      weightHistory: [],
      accuracyHistory: [],
    };

    console.log(`\n=== Training Started ===`);
    console.log(`Samples: ${this.trainingSamples.length}`);
    console.log(`Epochs: ${epochs}`);
    console.log(`Learning Rate: ${this.learningRate}\n`);

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;
      const gradients = {
        α1: 0,
        α2: 0,
        α3: 0,
        α4: 0,
        β: 0,
      };

      // 计算梯度
      for (const sample of this.trainingSamples) {
        const { L, S, C, M } = this.calculateDimensionScores(sample.features);
        const weights = this.getWeights();

        // 预测值
        const predicted = weights.α1 * L + weights.α2 * S + weights.α3 * C + weights.α4 * M + weights.β;

        // 误差
        const error = predicted - sample.actualComplexity;

        // 损失（均方误差）
        totalLoss += error * error;

        // 梯度（MSE 的导数）
        gradients.α1 += 2 * error * L;
        gradients.α2 += 2 * error * S;
        gradients.α3 += 2 * error * C;
        gradients.α4 += 2 * error * M;
        gradients.β += 2 * error;
      }

      // 平均梯度
      const n = this.trainingSamples.length;
      gradients.α1 /= n;
      gradients.α2 /= n;
      gradients.α3 /= n;
      gradients.α4 /= n;
      gradients.β /= n;

      // 梯度裁剪（防止梯度爆炸）
      const maxGradient = 10.0;
      gradients.α1 = Math.max(-maxGradient, Math.min(maxGradient, gradients.α1));
      gradients.α2 = Math.max(-maxGradient, Math.min(maxGradient, gradients.α2));
      gradients.α3 = Math.max(-maxGradient, Math.min(maxGradient, gradients.α3));
      gradients.α4 = Math.max(-maxGradient, Math.min(maxGradient, gradients.α4));
      gradients.β = Math.max(-maxGradient, Math.min(maxGradient, gradients.β));

      // 更新权重（梯度下降）
      const currentWeights = this.getWeights();
      this.updateWeights({
        α1: currentWeights.α1 - this.learningRate * gradients.α1,
        α2: currentWeights.α2 - this.learningRate * gradients.α2,
        α3: currentWeights.α3 - this.learningRate * gradients.α3,
        α4: currentWeights.α4 - this.learningRate * gradients.α4,
        β: currentWeights.β - this.learningRate * gradients.β,
      });

      // 归一化权重（确保 α1 + α2 + α3 + α4 = 1）
      this.normalizeWeights();

      // 权重裁剪（确保权重在合理范围内）
      this.clipWeights();

      // 记录统计
      const avgLoss = totalLoss / n;
      const accuracy = this.calculateAccuracy();

      if (epoch % 10 === 0 || epoch === epochs - 1) {
        console.log(`Epoch ${epoch + 1}/${epochs}: Loss = ${avgLoss.toFixed(4)}, Accuracy = ${(accuracy * 100).toFixed(1)}%`);

        stats.weightHistory.push({
          timestamp: Date.now(),
          weights: this.getWeights(),
          loss: avgLoss,
        });

        stats.accuracyHistory.push({
          timestamp: Date.now(),
          accuracy,
        });
      }
    }

    stats.averageLoss = stats.weightHistory[stats.weightHistory.length - 1]?.loss || 0;

    console.log(`\n=== Training Complete ===`);
    console.log(`Final Loss: ${stats.averageLoss.toFixed(4)}`);
    console.log(`Final Accuracy: ${(stats.accuracyHistory[stats.accuracyHistory.length - 1]?.accuracy * 100).toFixed(1)}%`);
    console.log(`\nUpdated Weights:`);
    const finalWeights = this.getWeights();
    console.log(`  α1 (Linguistic): ${finalWeights.α1.toFixed(3)}`);
    console.log(`  α2 (Structural): ${finalWeights.α2.toFixed(3)}`);
    console.log(`  α3 (Contextual): ${finalWeights.α3.toFixed(3)}`);
    console.log(`  α4 (Semantic): ${finalWeights.α4.toFixed(3)}`);
    console.log(`  β (Bias): ${finalWeights.β.toFixed(3)}\n`);

    // 保存权重
    this.saveWeights();

    return stats;
  }

  /**
   * 在线学习（使用最近的样本）
   */
  private trainOnRecentSamples() {
    const recentSamples = this.trainingSamples.slice(-this.trainingInterval);

    // 只训练有真实标签的样本
    const labeledSamples = recentSamples.filter(
      s => s.actualComplexity !== s.predictedComplexity
    );

    if (labeledSamples.length < 3) {
      return;  // 样本太少，跳过
    }

    // 使用小批量梯度下降
    const gradients = {
      α1: 0,
      α2: 0,
      α3: 0,
      α4: 0,
      β: 0,
    };

    for (const sample of labeledSamples) {
      const { L, S, C, M } = this.calculateDimensionScores(sample.features);
      const weights = this.getWeights();

      const predicted = weights.α1 * L + weights.α2 * S + weights.α3 * C + weights.α4 * M + weights.β;
      const error = predicted - sample.actualComplexity;

      gradients.α1 += 2 * error * L;
      gradients.α2 += 2 * error * S;
      gradients.α3 += 2 * error * C;
      gradients.α4 += 2 * error * M;
      gradients.β += 2 * error;
    }

    // 平均梯度
    const n = labeledSamples.length;
    gradients.α1 /= n;
    gradients.α2 /= n;
    gradients.α3 /= n;
    gradients.α4 /= n;
    gradients.β /= n;

    // 更新权重
    const currentWeights = this.getWeights();
    this.updateWeights({
      α1: currentWeights.α1 - this.learningRate * gradients.α1,
      α2: currentWeights.α2 - this.learningRate * gradients.α2,
      α3: currentWeights.α3 - this.learningRate * gradients.α3,
      α4: currentWeights.α4 - this.learningRate * gradients.α4,
      β: currentWeights.β - this.learningRate * gradients.β,
    });

    this.normalizeWeights();
    this.saveWeights();
  }

  /**
   * 归一化权重（确保 α1 + α2 + α3 + α4 = 1）
   */
  private normalizeWeights() {
    const weights = this.getWeights();
    const sum = weights.α1 + weights.α2 + weights.α3 + weights.α4;

    if (sum > 0) {
      this.updateWeights({
        α1: weights.α1 / sum,
        α2: weights.α2 / sum,
        α3: weights.α3 / sum,
        α4: weights.α4 / sum,
        β: weights.β,  // 偏置项不归一化
      });
    }
  }

  /**
   * 权重裁剪（确保权重在合理范围内）
   */
  private clipWeights() {
    const weights = this.getWeights();

    // 确保权重为正且在合理范围内
    this.updateWeights({
      α1: Math.max(0.01, Math.min(0.99, weights.α1)),
      α2: Math.max(0.01, Math.min(0.99, weights.α2)),
      α3: Math.max(0.0, Math.min(0.99, weights.α3)),
      α4: Math.max(0.0, Math.min(0.99, weights.α4)),
      β: Math.max(-50, Math.min(50, weights.β)),  // 偏置项范围
    });
  }

  /**
   * 计算维度得分（从特征中）
   */
  private calculateDimensionScores(features: TaskFeatures) {
    return {
      L: this.calculateLinguisticScore(features.linguistic),
      S: this.calculateStructuralScore(features.structural),
      C: this.calculateContextualScore(features.contextual),
      M: this.calculateSemanticScore(features.semantic),
    };
  }

  /**
   * 计算准确率
   */
  private calculateAccuracy(): number {
    let correct = 0;

    for (const sample of this.trainingSamples) {
      const result = this.classify(sample.input, sample.context);
      if (result.decision === sample.actualDecision) {
        correct++;
      }
    }

    return correct / this.trainingSamples.length;
  }

  /**
   * 决策转复杂度
   */
  private decisionToComplexity(decision: TrainingSample["actualDecision"]): number {
    switch (decision) {
      case "chitchat": return 10;
      case "simple_query": return 25;
      case "medium_task": return 40;
      case "complex_task": return 60;
    }
  }

  /**
   * 获取训练样本
   */
  getTrainingSamples(): TrainingSample[] {
    return [...this.trainingSamples];
  }

  /**
   * 获取学习统计
   */
  getStats(): {
    totalSamples: number;
    labeledSamples: number;
    accuracy: number;
    weights: Record<string, number>;
  } {
    const labeledSamples = this.trainingSamples.filter(
      s => s.actualComplexity !== s.predictedComplexity
    );

    return {
      totalSamples: this.trainingSamples.length,
      labeledSamples: labeledSamples.length,
      accuracy: this.calculateAccuracy(),
      weights: this.getWeights(),
    };
  }

  /**
   * 保存训练样本到文件
   */
  private saveTrainingSamples() {
    try {
      const dir = path.dirname(this.storageFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        this.storageFile,
        JSON.stringify(this.trainingSamples, null, 2)
      );
    } catch (error) {
      console.error("Failed to save training samples:", error);
    }
  }

  /**
   * 从文件加载训练样本
   */
  private loadTrainingSamples() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, "utf-8");
        this.trainingSamples = JSON.parse(data);
        console.log(`Loaded ${this.trainingSamples.length} training samples from ${this.storageFile}`);
      }
    } catch (error) {
      console.error("Failed to load training samples:", error);
      this.trainingSamples = [];
    }
  }

  /**
   * 保存权重到文件
   */
  private saveWeights() {
    try {
      const weightsFile = this.storageFile.replace(".json", "-weights.json");
      fs.writeFileSync(
        weightsFile,
        JSON.stringify({
          weights: this.getWeights(),
          timestamp: Date.now(),
        }, null, 2)
      );
    } catch (error) {
      console.error("Failed to save weights:", error);
    }
  }

  /**
   * 从文件加载权重
   */
  loadWeights() {
    try {
      const weightsFile = this.storageFile.replace(".json", "-weights.json");
      if (fs.existsSync(weightsFile)) {
        const data = fs.readFileSync(weightsFile, "utf-8");
        const { weights } = JSON.parse(data);
        this.updateWeights(weights);
        console.log(`Loaded weights from ${weightsFile}`);
      }
    } catch (error) {
      console.error("Failed to load weights:", error);
    }
  }

  /**
   * 重置训练数据
   */
  reset() {
    this.trainingSamples = [];
    this.saveTrainingSamples();
  }

  /**
   * 设置学习率
   */
  setLearningRate(rate: number) {
    this.learningRate = rate;
  }
}

/**
 * 便捷函数：创建自适应分类器
 */
export function createAdaptiveClassifier(storageFile?: string): AdaptiveTaskComplexityClassifier {
  return new AdaptiveTaskComplexityClassifier(storageFile);
}
