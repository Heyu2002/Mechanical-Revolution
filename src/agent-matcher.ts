/**
 * TF-IDF based Agent Matcher
 *
 * 理论基础：
 * - Salton & McGill (1983) - "Introduction to Modern Information Retrieval"
 * - TF-IDF: Term Frequency - Inverse Document Frequency
 * - Cosine Similarity: 余弦相似度用于衡量向量相似性
 *
 * 核心思想：
 * 1. 将 Agent 的能力描述视为"文档"
 * 2. 将用户输入视为"查询"
 * 3. 使用 TF-IDF 向量化
 * 4. 计算余弦相似度找到最匹配的 Agent
 */

import type { AgentConfig, AgentCapabilities } from "./types.js";

/**
 * Agent 匹配结果
 */
export interface AgentMatchResult {
  bestAgent: AgentConfig;
  shouldHandoff: boolean;
  similarity: number;
  reasoning: string;
  allScores: Array<{
    agent: string;
    similarity: number;
  }>;
}

/**
 * TF-IDF Agent Matcher
 */
export class TFIDFAgentMatcher {
  private vocabulary: Set<string> = new Set();
  private idfScores: Map<string, number> = new Map();
  private agentVectors: Map<string, number[]> = new Map();
  private agents: AgentConfig[];

  // 同义词映射：将不同表达方式映射到核心概念
  private synonymMap: Map<string, string[]> = new Map([
    // 编码相关
    ["编码", ["写代码", "写", "生成代码", "生成", "实现代码", "实现", "开发", "编写", "创建代码", "创建", "做", "搞"]],
    ["算法", ["算法实现", "算法设计", "算法优化", "写算法", "实现算法", "生成算法", "设计算法", "创建算法"]],
    ["代码", ["代码生成", "代码实现", "代码编写", "代码开发", "代码创建", "程序", "脚本", "函数", "方法"]],

    // 中文相关
    ["中文", ["中文内容", "中文文案", "中文处理", "汉语", "国语"]],
    ["翻译", ["翻译内容", "语言转换", "中英翻译", "英中翻译"]],
    ["润色", ["内容润色", "文案润色", "优化文案", "改进文案"]],

    // 图像相关
    ["图像", ["图片", "图像分析", "图片分析", "图像处理", "图片处理", "视觉"]],
    ["识别", ["OCR", "文字识别", "图像识别", "图片识别"]],

    // 任务相关
    ["分解", ["任务分解", "拆分任务", "分解任务"]],
    ["协调", ["任务协调", "协调任务", "统筹"]],
  ]);

  constructor(agents: AgentConfig[]) {
    this.agents = agents.filter(a => a.capabilities);

    if (this.agents.length === 0) {
      throw new Error("No agents with capabilities provided");
    }

    this.initialize();
  }

  /**
   * 初始化：构建词汇表、计算 IDF、向量化所有 Agent
   */
  private initialize() {
    this.buildVocabulary();
    this.calculateIDF();
    this.vectorizeAgents();
  }

  /**
   * 构建词汇表
   */
  private buildVocabulary() {
    for (const agent of this.agents) {
      const doc = this.agentToDocument(agent);
      const tokens = this.tokenize(doc);
      tokens.forEach(token => this.vocabulary.add(token));
    }
  }

  /**
   * 将 Agent 能力描述转换为文档
   */
  private agentToDocument(agent: AgentConfig): string {
    const cap = agent.capabilities!;

    const parts: string[] = [
      cap.summary,
      ...cap.modelStrengths,
      ...cap.taskTypes,
    ];

    if (cap.languages) {
      parts.push(...cap.languages);
    }

    if (cap.bestFor) {
      parts.push(...cap.bestFor);
    }

    return parts.join(' ');
  }

  /**
   * 分词（支持中英文）+ 同义词扩展
   *
   * 策略：
   * - 中文：按字分词（因为中文词汇边界不明确）
   * - 英文：按词分词，转小写
   * - 数字和特殊符号：保留（如 "TypeScript", "React19"）
   * - 同义词扩展：将常见表达映射到核心概念
   */
  private tokenize(text: string): string[] {
    const tokens: string[] = [];

    // 提取中文字符
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    tokens.push(...chineseChars);

    // 提取英文单词（包含数字和下划线）
    const englishWords = text.toLowerCase().match(/[a-z0-9_]+/g) || [];
    tokens.push(...englishWords);

    // 同义词扩展：检查文本中是否包含同义词，如果有则添加核心概念
    const expandedTokens = this.expandSynonyms(text);
    tokens.push(...expandedTokens);

    return tokens;
  }

  /**
   * 同义词扩展
   *
   * 例如：
   * - "写代码" → 添加 "编"、"码"（核心词"编码"的字符）
   * - "生成算法" → 添加 "算"、"法"（核心词"算法"的字符）
   * - "创建脚本" → 添加 "编"、"码"、"代"、"码"（核心词"编码"和"代码"的字符）
   *
   * 通过多次添加核心词字符来增强匹配权重
   */
  private expandSynonyms(text: string): string[] {
    const expanded: string[] = [];

    for (const [core, synonyms] of this.synonymMap.entries()) {
      let matched = false;

      // 检查核心词是否在文本中
      if (text.includes(core)) {
        matched = true;
      }

      // 检查同义词是否在文本中
      if (!matched) {
        for (const synonym of synonyms) {
          if (text.includes(synonym)) {
            matched = true;
            break;
          }
        }
      }

      // 如果匹配，添加核心词的字符（多次添加以增强权重）
      if (matched) {
        const coreChars = core.match(/[\u4e00-\u9fa5]/g) || [];
        // 添加 3 次以增强权重
        for (let i = 0; i < 3; i++) {
          expanded.push(...coreChars);
        }
      }
    }

    return expanded;
  }

  /**
   * 计算 IDF (Inverse Document Frequency)
   *
   * 公式: IDF(term) = log(N / df(term))
   * - N: 总文档数（Agent 数量）
   * - df(term): 包含该词的文档数
   *
   * 直觉：
   * - 如果一个词在所有 Agent 中都出现，IDF 接近 0（不重要）
   * - 如果一个词只在少数 Agent 中出现，IDF 较大（重要）
   */
  private calculateIDF() {
    const N = this.agents.length;
    const termDocCount = new Map<string, number>();

    // 统计每个词出现在多少个文档中
    for (const agent of this.agents) {
      const doc = this.agentToDocument(agent);
      const uniqueTokens = new Set(this.tokenize(doc));

      for (const token of uniqueTokens) {
        termDocCount.set(token, (termDocCount.get(token) || 0) + 1);
      }
    }

    // 计算 IDF
    for (const [term, df] of termDocCount.entries()) {
      // 使用平滑 IDF 避免除零：log((N + 1) / (df + 1)) + 1
      this.idfScores.set(term, Math.log((N + 1) / (df + 1)) + 1);
    }
  }

  /**
   * 将所有 Agent 向量化
   */
  private vectorizeAgents() {
    for (const agent of this.agents) {
      const doc = this.agentToDocument(agent);
      const vector = this.documentToVector(doc);
      this.agentVectors.set(agent.name, vector);
    }
  }

  /**
   * 将文档转换为 TF-IDF 向量
   *
   * 公式: TF-IDF(term, doc) = TF(term, doc) × IDF(term)
   * - TF(term, doc): 词频（term 在 doc 中出现的次数）
   * - IDF(term): 逆文档频率
   */
  private documentToVector(doc: string): number[] {
    const tokens = this.tokenize(doc);
    const termFreq = new Map<string, number>();

    // 计算 TF (Term Frequency)
    for (const token of tokens) {
      termFreq.set(token, (termFreq.get(token) || 0) + 1);
    }

    // 构建 TF-IDF 向量（按词汇表顺序）
    const vector: number[] = [];
    for (const term of this.vocabulary) {
      const tf = termFreq.get(term) || 0;
      const idf = this.idfScores.get(term) || 0;
      vector.push(tf * idf);
    }

    // L2 归一化
    return this.normalize(vector);
  }

  /**
   * 向量归一化（L2 范数）
   *
   * 公式: v_normalized = v / ||v||
   * - ||v|| = sqrt(v₁² + v₂² + ... + vₙ²)
   *
   * 目的：使所有向量长度为 1，便于比较方向（相似度）
   */
  private normalize(vector: number[]): number[] {
    const magnitude = Math.sqrt(
      vector.reduce((sum, val) => sum + val * val, 0)
    );

    if (magnitude === 0) {
      return vector;
    }

    return vector.map(val => val / magnitude);
  }

  /**
   * 计算余弦相似度
   *
   * 公式: cosine_similarity(A, B) = (A · B) / (||A|| × ||B||)
   *
   * 由于向量已归一化（||A|| = ||B|| = 1），直接计算点积即可：
   * cosine_similarity(A, B) = A · B = Σ(Aᵢ × Bᵢ)
   *
   * 取值范围: [0, 1]
   * - 1: 完全相同
   * - 0: 完全不相关
   */
  private cosineSimilarity(vec1: number[], vec2: number[]): number {
    if (vec1.length !== vec2.length) {
      throw new Error("Vectors must have the same length");
    }

    return vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
  }

  /**
   * 找到最匹配的 Agent
   *
   * @param input - 用户输入
   * @param currentAgent - 当前 Agent
   * @param availableAgents - 可用的 Agent 列表（可选，默认使用所有 Agent）
   * @returns Agent 匹配结果
   */
  findBestAgent(
    input: string,
    currentAgent: AgentConfig,
    availableAgents?: AgentConfig[]
  ): AgentMatchResult {
    const agents = availableAgents || this.agents;

    // 将用户输入向量化
    const inputVector = this.documentToVector(input);

    // 计算与所有 Agent 的相似度
    const similarities = agents
      .filter(agent => this.agentVectors.has(agent.name))
      .map(agent => ({
        agent,
        similarity: this.cosineSimilarity(
          inputVector,
          this.agentVectors.get(agent.name)!
        ),
      }));

    if (similarities.length === 0) {
      throw new Error("No valid agents to match");
    }

    // 找到最高相似度
    const best = similarities.reduce((max, curr) =>
      curr.similarity > max.similarity ? curr : max
    );

    // 计算当前 Agent 的相似度
    const currentSimilarity = this.agentVectors.has(currentAgent.name)
      ? this.cosineSimilarity(
          inputVector,
          this.agentVectors.get(currentAgent.name)!
        )
      : 0;

    // 决策阈值
    const MIN_ABSOLUTE_SIMILARITY = 0.15;  // 最佳匹配的绝对相似度 >= 15%
    const MIN_IMPROVEMENT = 0.08;          // 相似度提升 >= 8%

    // 需要同时满足两个条件：
    // 1. 最佳匹配的相似度足够高（绝对值）
    // 2. 比当前 Agent 有明显提升（相对值）
    // 3. 不是同一个 Agent
    const shouldHandoff =
      best.similarity >= MIN_ABSOLUTE_SIMILARITY &&
      (best.similarity - currentSimilarity) >= MIN_IMPROVEMENT &&
      best.agent.name !== currentAgent.name;

    return {
      bestAgent: best.agent,
      shouldHandoff,
      similarity: best.similarity,
      reasoning: this.generateReasoning(
        input,
        currentAgent,
        best.agent,
        currentSimilarity,
        best.similarity,
        shouldHandoff
      ),
      allScores: similarities
        .map(s => ({
          agent: s.agent.name,
          similarity: s.similarity,
        }))
        .sort((a, b) => b.similarity - a.similarity),
    };
  }

  /**
   * 生成推理说明
   */
  private generateReasoning(
    input: string,
    currentAgent: AgentConfig,
    bestAgent: AgentConfig,
    currentSimilarity: number,
    bestSimilarity: number,
    shouldHandoff: boolean
  ): string {
    const currentPercent = (currentSimilarity * 100).toFixed(1);
    const bestPercent = (bestSimilarity * 100).toFixed(1);

    if (!shouldHandoff) {
      return `任务与当前 Agent (${currentAgent.name}) 匹配度较高 (${currentPercent}%)，继续使用当前 Agent`;
    }

    const diff = ((bestSimilarity - currentSimilarity) * 100).toFixed(1);
    return `任务与 ${bestAgent.name} 的匹配度更高 (${bestPercent}% vs ${currentPercent}%，差距 ${diff}%)，建议切换`;
  }

  /**
   * 获取词汇表统计信息（用于调试）
   */
  getStats() {
    return {
      vocabularySize: this.vocabulary.size,
      agentCount: this.agents.length,
      vectorDimension: this.vocabulary.size,
      agents: this.agents.map(a => ({
        name: a.name,
        hasVector: this.agentVectors.has(a.name),
      })),
    };
  }

  /**
   * 分析输入的特征（用于调试）
   */
  analyzeInput(input: string) {
    const tokens = this.tokenize(input);
    const uniqueTokens = new Set(tokens);
    const vector = this.documentToVector(input);

    // 找出权重最高的词
    const tokenWeights: Array<{ token: string; weight: number }> = [];
    let i = 0;
    for (const term of this.vocabulary) {
      if (vector[i] > 0) {
        tokenWeights.push({ token: term, weight: vector[i] });
      }
      i++;
    }
    tokenWeights.sort((a, b) => b.weight - a.weight);

    return {
      input,
      tokenCount: tokens.length,
      uniqueTokenCount: uniqueTokens.size,
      topTokens: tokenWeights.slice(0, 10),
      chineseCharRatio: this.getChineseCharRatio(input),
    };
  }

  /**
   * 计算中文字符比例
   */
  private getChineseCharRatio(text: string): number {
    const chineseChars = text.match(/[\u4e00-\u9fa5]/g) || [];
    return text.length > 0 ? chineseChars.length / text.length : 0;
  }
}

/**
 * 便捷函数：创建 Agent Matcher
 */
export function createAgentMatcher(agents: AgentConfig[]): TFIDFAgentMatcher {
  return new TFIDFAgentMatcher(agents);
}
