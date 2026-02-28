/**
 * Task Complexity Classifier
 *
 * 基于回归方程的任务复杂度计算
 *
 * 核心公式:
 * TaskComplexity = α₁·L + α₂·S + α₃·C + α₄·M + β
 *
 * 其中:
 * - L (Linguistic Score): 语言特征得分 [0-100]
 * - S (Structural Score): 结构特征得分 [0-100]
 * - C (Contextual Score): 上下文特征得分 [0-100]
 * - M (Semantic Score): 语义特征得分 [0-100]
 * - α₁, α₂, α₃, α₄: 权重系数
 * - β: 偏置项
 */

import type { AgentContext } from "./types.js";

/**
 * 任务复杂度分类结果
 */
export interface TaskComplexityResult {
  complexity: number;           // 0-100
  decision: "chitchat" | "simple_query" | "medium_task" | "complex_task";
  shouldDecompose: boolean;     // 是否需要任务拆分
  breakdown: {
    linguistic: number;
    structural: number;
    contextual: number;
    semantic: number;
  };
  reasoning: string;
  features: TaskFeatures;
}

/**
 * 任务特征
 */
export interface TaskFeatures {
  // 语言特征
  linguistic: {
    actionVerbScore: number;
    goalWordScore: number;
    complexityScore: number;
    lengthScore: number;
    techScore: number;
  };

  // 结构特征
  structural: {
    stepScore: number;
    domainScore: number;
    constraintScore: number;
    outputScore: number;
  };

  // 上下文特征
  contextual: {
    taskStateScore: number;
    relevanceScore: number;
    historyScore: number;
  };

  // 语义特征
  semantic: {
    intentScore: number;
    completenessScore: number;
    professionalScore: number;
  };
}

/**
 * 任务复杂度分类器
 */
export class TaskComplexityClassifier {
  // 回归方程权重
  private weights = {
    α1: 0.45,  // 语言特征权重
    α2: 0.35,  // 结构特征权重
    α3: 0.05,  // 上下文特征权重
    α4: 0.15,  // 语义特征权重（提高）
    β: 10,     // 偏置项（提供基础分）
  };

  // 子维度权重
  private linguisticWeights = {
    actionVerb: 0.35,  // 提高动作词权重
    goalWord: 0.20,
    complexity: 0.25,
    length: 0.15,      // 提高长度权重
    tech: 0.05,        // 降低技术词权重
  };

  private structuralWeights = {
    step: 0.35,
    domain: 0.30,
    constraint: 0.20,
    output: 0.15,
  };

  private contextualWeights = {
    taskState: 0.40,
    relevance: 0.35,
    history: 0.25,
  };

  private semanticWeights = {
    intent: 0.40,
    completeness: 0.35,
    professional: 0.25,
  };

  // 动作词库
  private actionVerbs = {
    strong: [
      "实现", "创建", "编写", "开发", "构建", "设计", "生成", "制作", "写",
      "implement", "create", "build", "develop", "design", "generate", "make", "write",
    ],
    medium: [
      "分析", "研究", "计算", "优化", "改进", "处理", "解决", "识别",
      "analyze", "research", "calculate", "optimize", "improve", "process", "solve", "identify",
    ],
    weak: [
      "看看", "了解", "学习", "查查", "试试",
      "check", "learn", "try", "look",
    ],
  };

  // 目标词
  private goalWords = [
    "需要", "想要", "帮我", "请", "能否", "可以", "希望", "麻烦",
    "need", "want", "help", "please", "could", "can", "would",
  ];

  // 复杂度连接词
  private complexityIndicators = {
    sequential: ["然后", "接着", "之后", "再", "最后", "随后", "then", "after", "next", "finally"],
    parallel: ["同时", "并且", "以及", "还要", "另外", "and", "also", "additionally", "meanwhile"],
    conditional: ["如果", "当", "假设", "若", "倘若", "if", "when", "assuming", "provided"],
  };

  // 技术术语模式
  private techPatterns = [
    /TypeScript|JavaScript|Python|Java|Rust|Go|C\+\+|Ruby|PHP/i,
    /React|Vue|Angular|Node\.js|Express|Django|Flask|Spring/i,
    /API|REST|GraphQL|WebSocket|HTTP|HTTPS/i,
    /数据库|MySQL|MongoDB|PostgreSQL|Redis|SQL/i,
    /算法|数据结构|设计模式|架构/i,
    /\.(ts|js|py|java|go|rs|cpp|rb|php)\b/,
    /\d+\s*(GB|MB|KB|ms|秒|分钟|小时)/,
  ];

  // 步骤指示词
  private stepIndicators = [
    /第[一二三四五六七八九十\d]+步/,
    /步骤\s*[一二三四五\d]/,
    /首先|其次|然后|接着|最后|再次/,
    /first|second|third|fourth|then|finally|next/i,
    /\d+\.\s/,  // "1. ", "2. "
  ];

  // 领域关键词
  private domains = {
    coding: ["代码", "编程", "实现", "函数", "类", "方法", "code", "programming", "function", "class"],
    research: ["研究", "调查", "分析", "探索", "research", "investigate", "analyze", "explore"],
    math: ["计算", "数学", "统计", "公式", "方程", "calculate", "math", "formula", "equation"],
    writing: ["写", "创作", "文案", "内容", "文章", "write", "content", "article"],
    design: ["设计", "架构", "规划", "布局", "design", "architecture", "layout"],
    data: ["数据", "处理", "清洗", "分析", "data", "process", "clean"],
    image: ["图片", "图像", "照片", "视觉", "image", "picture", "photo", "visual"],
  };

  // 约束条件模式
  private constraintPatterns = [
    /必须|一定要|需要|要求|务必/,
    /不能|不要|避免|禁止|不可/,
    /在.*之前|在.*之后|.*以内|.*之内/,
    /使用.*技术|基于.*框架|采用.*方法/,
    /性能|效率|优化|速度/,
    /兼容|支持.*版本|适配/,
  ];

  // 输出指示词
  private outputIndicators = [
    /生成.*文件/,
    /输出.*格式/,
    /返回.*结果/,
    /创建.*项目/,
    /实现.*功能/,
    /\.(json|csv|md|pdf|png|jpg|txt|xml|html)/,
  ];

  // 问题模式
  private questionPatterns = [
    /^(什么|为什么|怎么|如何|哪个|是否|能否)/,
    /\?$/,
    /^(what|why|how|which|is|can|do|does|could|would)\b/i,
  ];

  /**
   * 分类任务复杂度
   */
  classify(
    input: string,
    context?: AgentContext
  ): TaskComplexityResult {
    // 1. 提取特征
    const features = this.extractFeatures(input, context);

    // 2. 计算各维度得分
    const L = this.calculateLinguisticScore(features.linguistic);
    const S = this.calculateStructuralScore(features.structural);
    const C = this.calculateContextualScore(features.contextual);
    const M = this.calculateSemanticScore(features.semantic);

    // 3. 应用回归方程
    const complexity =
      this.weights.α1 * L +
      this.weights.α2 * S +
      this.weights.α3 * C +
      this.weights.α4 * M +
      this.weights.β;

    // 4. 决策
    const decision = this.makeDecision(complexity);
    const shouldDecompose = complexity >= 48;  // 调整阈值

    return {
      complexity,
      decision,
      shouldDecompose,
      breakdown: {
        linguistic: L,
        structural: S,
        contextual: C,
        semantic: M,
      },
      reasoning: this.generateReasoning(complexity, decision, { L, S, C, M }),
      features,
    };
  }

  /**
   * 提取任务特征
   */
  private extractFeatures(
    input: string,
    context?: AgentContext
  ): TaskFeatures {
    return {
      linguistic: {
        actionVerbScore: this.scoreActionVerbs(input),
        goalWordScore: this.scoreGoalWords(input),
        complexityScore: this.scoreComplexityIndicators(input),
        lengthScore: this.scoreLength(input),
        techScore: this.scoreTechTerms(input),
      },
      structural: {
        stepScore: this.scoreSteps(input),
        domainScore: this.scoreDomains(input),
        constraintScore: this.scoreConstraints(input),
        outputScore: this.scoreOutput(input),
      },
      contextual: {
        taskStateScore: this.scoreTaskState(context),
        relevanceScore: this.scoreRelevance(input, context),
        historyScore: this.scoreHistory(context),
      },
      semantic: {
        intentScore: this.scoreIntent(input),
        completenessScore: this.scoreCompleteness(input),
        professionalScore: this.scoreProfessional(input),
      },
    };
  }

  // ═══════════════════════════════════════════════════════════
  // 语言特征评分
  // ═══════════════════════════════════════════════════════════

  protected scoreActionVerbs(input: string): number {
    const strongCount = this.actionVerbs.strong.filter(v => input.includes(v)).length;
    const mediumCount = this.actionVerbs.medium.filter(v => input.includes(v)).length;
    const weakCount = this.actionVerbs.weak.filter(v => input.includes(v)).length;

    // 提高基础分数
    const score = (strongCount * 50 + mediumCount * 35 + weakCount * 15);
    return Math.min(score, 100);
  }

  protected scoreGoalWords(input: string): number {
    const count = this.goalWords.filter(w => input.includes(w)).length;
    // 提高目标词的权重
    return Math.min(count * 30, 100);
  }

  protected scoreComplexityIndicators(input: string): number {
    const sequential = this.complexityIndicators.sequential.filter(i => input.includes(i)).length;
    const parallel = this.complexityIndicators.parallel.filter(i => input.includes(i)).length;
    const conditional = this.complexityIndicators.conditional.filter(i => input.includes(i)).length;

    const score = sequential * 30 + parallel * 35 + conditional * 35;
    return Math.min(score, 100);
  }

  protected scoreLength(input: string): number {
    // 提高长度的权重
    return Math.min((input.length / 5), 100);  // 每5个字符得1分
  }

  protected scoreTechTerms(input: string): number {
    const matches = this.techPatterns.filter(p => p.test(input)).length;
    return (matches / this.techPatterns.length) * 100;
  }

  protected calculateLinguisticScore(features: TaskFeatures["linguistic"]): number {
    return (
      this.linguisticWeights.actionVerb * features.actionVerbScore +
      this.linguisticWeights.goalWord * features.goalWordScore +
      this.linguisticWeights.complexity * features.complexityScore +
      this.linguisticWeights.length * features.lengthScore +
      this.linguisticWeights.tech * features.techScore
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 结构特征评分
  // ═══════════════════════════════════════════════════════════

  protected scoreSteps(input: string): number {
    const count = this.stepIndicators.filter(p => p.test(input)).length;
    // 提高步骤的权重
    return Math.min(count * 35, 100);
  }

  protected scoreDomains(input: string): number {
    const matchedDomains = Object.values(this.domains).filter(keywords =>
      keywords.some(keyword => input.toLowerCase().includes(keyword.toLowerCase()))
    );
    // 提高跨域的权重
    return Math.min(matchedDomains.length * 35, 100);
  }

  protected scoreConstraints(input: string): number {
    const count = this.constraintPatterns.filter(p => p.test(input)).length;
    // 提高约束的权重
    return Math.min(count * 25, 100);
  }

  protected scoreOutput(input: string): number {
    const hasExplicitOutput = this.outputIndicators.some(p => p.test(input));
    return hasExplicitOutput ? 80 : 20;
  }

  protected calculateStructuralScore(features: TaskFeatures["structural"]): number {
    return (
      this.structuralWeights.step * features.stepScore +
      this.structuralWeights.domain * features.domainScore +
      this.structuralWeights.constraint * features.constraintScore +
      this.structuralWeights.output * features.outputScore
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 上下文特征评分
  // ═══════════════════════════════════════════════════════════

  protected scoreTaskState(context?: AgentContext): number {
    if (!context) return 0;  // 改为0，避免无意义的基础分

    // 这里简化处理，实际应该检查 context.state 中的任务状态
    // 如果有当前任务且未完成，分数较低（可能是任务延续）
    // 如果没有当前任务，分数较高（可能是新任务）
    return 0;  // 暂时返回0，等有实际上下文再使用
  }

  protected scoreRelevance(input: string, context?: AgentContext): number {
    if (!context || !context.history || context.history.length === 0) {
      return 0;  // 改为0
    }

    // 简化：检查输入与最近一条消息的相似度
    const lastMessage = context.history[context.history.length - 1];
    if (!lastMessage || !lastMessage.content) {
      return 0;
    }

    const similarity = this.calculateSimpleSimilarity(input, lastMessage.content);
    // 相似度高 → 可能是任务延续 → 分数低
    // 相似度低 → 可能是新任务 → 分数高
    return (1 - similarity) * 100;
  }

  protected scoreHistory(context?: AgentContext): number {
    if (!context || !context.history) return 0;
    return Math.min(context.history.length * 5, 100);
  }

  protected calculateContextualScore(features: TaskFeatures["contextual"]): number {
    return (
      this.contextualWeights.taskState * features.taskStateScore +
      this.contextualWeights.relevance * features.relevanceScore +
      this.contextualWeights.history * features.historyScore
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 语义特征评分
  // ═══════════════════════════════════════════════════════════

  protected scoreIntent(input: string): number {
    const isQuestion = this.questionPatterns.some(p => p.test(input));

    if (isQuestion) {
      // 问题也可能是复杂任务，检查是否包含动作词
      const hasActionVerb = this.actionVerbs.strong.some(v => input.includes(v)) ||
                           this.actionVerbs.medium.some(v => input.includes(v));

      if (hasActionVerb || input.length > 50) {
        // 复杂问题（如"如何实现..."）
        return 70;
      }
      // 简单问题 - 提高基础分，确保被识别为 simple_query
      return 60;
    } else {
      // 陈述/祈使句通常是任务
      return 80;
    }
  }

  protected scoreCompleteness(input: string): number {
    // 简化的 5W1H 检测
    const elements = {
      what: /什么|what/i.test(input),
      why: /为什么|目的|why|purpose/i.test(input),
      how: /如何|怎么|方法|how|method/i.test(input),
      when: /什么时候|时间|when|time/i.test(input),
      where: /哪里|位置|where|location/i.test(input),
      who: /谁|用户|who|user/i.test(input),
    };

    const count = Object.values(elements).filter(Boolean).length;
    return (count / 6) * 100;
  }

  protected scoreProfessional(input: string): number {
    // 检测非正式用语
    const informalPatterns = [
      /哈哈|呵呵|嘿|哎|啊|呢|吧/,
      /lol|haha|hey|hmm/i,
    ];

    const informalCount = informalPatterns.filter(p => p.test(input)).length;
    const formalityScore = Math.max(100 - informalCount * 25, 0);

    // 结合技术术语密度
    const techScore = this.scoreTechTerms(input);

    return formalityScore * 0.4 + techScore * 0.6;
  }

  protected calculateSemanticScore(features: TaskFeatures["semantic"]): number {
    return (
      this.semanticWeights.intent * features.intentScore +
      this.semanticWeights.completeness * features.completenessScore +
      this.semanticWeights.professional * features.professionalScore
    );
  }

  // ═══════════════════════════════════════════════════════════
  // 辅助方法
  // ═══════════════════════════════════════════════════════════

  protected calculateSimpleSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(w => words2.has(w)));
    return intersection.size / Math.max(words1.size, words2.size);
  }

  private makeDecision(complexity: number): TaskComplexityResult["decision"] {
    if (complexity < 18) return "chitchat";      // 提高阈值
    if (complexity < 30) return "simple_query";
    if (complexity < 48) return "medium_task";   // 降低阈值
    return "complex_task";
  }

  private generateReasoning(
    complexity: number,
    decision: string,
    breakdown: { L: number; S: number; C: number; M: number }
  ): string {
    const parts: string[] = [];

    parts.push(`任务复杂度: ${complexity.toFixed(1)}/100`);
    parts.push(`分类: ${decision}`);

    // 找出主导因素
    const scores = [
      { name: "语言特征", value: breakdown.L },
      { name: "结构特征", value: breakdown.S },
      { name: "上下文特征", value: breakdown.C },
      { name: "语义特征", value: breakdown.M },
    ];
    const dominant = scores.reduce((max, curr) => curr.value > max.value ? curr : max);

    parts.push(`主导因素: ${dominant.name} (${dominant.value.toFixed(1)})`);

    return parts.join(", ");
  }

  /**
   * 更新权重（用于调优）
   */
  updateWeights(weights: Partial<typeof this.weights>) {
    this.weights = { ...this.weights, ...weights };
  }

  /**
   * 获取当前权重
   */
  getWeights() {
    return { ...this.weights };
  }
}

/**
 * 便捷函数：创建任务复杂度分类器
 */
export function createComplexityClassifier(): TaskComplexityClassifier {
  return new TaskComplexityClassifier();
}
