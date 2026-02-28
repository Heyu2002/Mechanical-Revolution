# 任务识别与分界点判断 - 设计方案

## 问题定义

**核心问题**：如何判断用户的输入是一个需要处理的"任务"，而不是闲聊、询问或其他类型的交互？

**为什么重要**：
- 避免对简单问候启动复杂的任务分解流程
- 节省 token 和计算资源
- 提供更好的用户体验（快速响应 vs 深度处理）

## 方案一：基于意图分类的任务判断

### 核心思路
在 Orchestrator 之前添加一个轻量级的"意图分类器"，快速判断输入类型。

### 输入分类

```typescript
enum InputType {
  // 非任务类型
  GREETING = "greeting",              // 问候："你好"、"Hi"
  CHITCHAT = "chitchat",              // 闲聊："今天天气真好"
  META_QUESTION = "meta_question",    // 元问题："你能做什么？"
  CLARIFICATION = "clarification",    // 澄清："我的意思是..."

  // 任务类型
  SIMPLE_TASK = "simple_task",        // 简单任务：单步骤，单领域
  COMPLEX_TASK = "complex_task",      // 复杂任务：多步骤，跨领域
  QUERY = "query",                    // 查询任务："什么是...？"
  CREATION = "creation",              // 创作任务："写一个...、实现一个..."
  ANALYSIS = "analysis",              // 分析任务："分析...、比较..."
}
```

### 任务判断标准

#### 1. 语言特征
```typescript
interface TaskIndicators {
  // 动作词（强任务信号）
  actionVerbs: string[];
  // 例如：实现、创建、编写、分析、计算、生成、设计、优化

  // 目标词（中等任务信号）
  goalWords: string[];
  // 例如：需要、想要、帮我、请、能否

  // 复杂度词（复杂任务信号）
  complexityWords: string[];
  // 例如：并且、然后、同时、首先、接着、最后

  // 非任务词（排除信号）
  nonTaskWords: string[];
  // 例如：你好、谢谢、再见、怎么样、如何
}
```

#### 2. 结构特征
```typescript
interface TaskStructure {
  hasMultipleSteps: boolean;      // 是否包含多个步骤
  hasCrossDomain: boolean;        // 是否跨领域（如"研究+编码"）
  hasSpecificOutput: boolean;     // 是否有明确的输出要求
  hasConstraints: boolean;        // 是否有约束条件
  hasContext: boolean;            // 是否提供了上下文
}
```

#### 3. 长度和复杂度
```typescript
interface TaskComplexity {
  wordCount: number;              // 字数
  sentenceCount: number;          // 句子数
  hasCodeBlock: boolean;          // 是否包含代码块
  hasFileReference: boolean;      // 是否引用文件
  hasDataInput: boolean;          // 是否包含数据输入
}
```

### 实现示例

```typescript
class TaskClassifier {
  private actionVerbs = [
    // 中文
    "实现", "创建", "编写", "写", "做", "生成", "设计", "开发",
    "分析", "计算", "优化", "重构", "修改", "添加", "删除",
    "研究", "调查", "比较", "总结", "翻译", "润色",
    // 英文
    "implement", "create", "write", "make", "generate", "design",
    "analyze", "calculate", "optimize", "refactor", "build",
  ];

  private complexityIndicators = [
    "并且", "然后", "接着", "同时", "首先", "其次", "最后",
    "and then", "after that", "next", "also", "first", "second",
  ];

  private nonTaskPatterns = [
    /^(你好|hi|hello|hey)/i,
    /^(谢谢|thanks|thank you)/i,
    /^(再见|bye|goodbye)/i,
    /你是谁|what are you|who are you/i,
    /你能做什么|what can you do/i,
  ];

  classify(input: string): InputType {
    // 1. 快速排除：非任务模式
    if (this.isNonTask(input)) {
      return this.classifyNonTask(input);
    }

    // 2. 检查任务特征
    const hasActionVerb = this.hasActionVerb(input);
    const hasMultipleSteps = this.hasMultipleSteps(input);
    const hasCrossDomain = this.hasCrossDomain(input);
    const wordCount = input.length;

    // 3. 判断任务类型
    if (!hasActionVerb && wordCount < 20) {
      return InputType.QUERY; // 简单查询
    }

    if (hasMultipleSteps || hasCrossDomain) {
      return InputType.COMPLEX_TASK; // 复杂任务
    }

    if (hasActionVerb) {
      return InputType.SIMPLE_TASK; // 简单任务
    }

    return InputType.CHITCHAT; // 默认闲聊
  }

  private isNonTask(input: string): boolean {
    return this.nonTaskPatterns.some(pattern => pattern.test(input));
  }

  private hasActionVerb(input: string): boolean {
    return this.actionVerbs.some(verb => input.includes(verb));
  }

  private hasMultipleSteps(input: string): boolean {
    return this.complexityIndicators.some(indicator =>
      input.includes(indicator)
    );
  }

  private hasCrossDomain(input: string): boolean {
    // 检查是否同时包含多个领域的关键词
    const domains = {
      code: ["代码", "编程", "实现", "code", "implement"],
      research: ["研究", "分析", "调查", "research", "analyze"],
      math: ["计算", "数学", "统计", "calculate", "math"],
      writing: ["写", "创作", "文案", "write", "content"],
    };

    const matchedDomains = Object.values(domains).filter(keywords =>
      keywords.some(keyword => input.includes(keyword))
    );

    return matchedDomains.length >= 2;
  }
}
```

### 使用流程

```typescript
const classifier = new TaskClassifier();

async function handleInput(input: string) {
  const inputType = classifier.classify(input);

  switch (inputType) {
    case InputType.GREETING:
    case InputType.CHITCHAT:
      // 直接响应，不启动任务流程
      return simpleResponse(input);

    case InputType.META_QUESTION:
      // 返回系统能力说明
      return showCapabilities();

    case InputType.SIMPLE_TASK:
      // 直接分配给单个 agent
      return executeSingleAgent(input);

    case InputType.COMPLEX_TASK:
      // 启动 Orchestrator 进行任务分解
      return executeOrchestrator(input);

    case InputType.QUERY:
      // 分配给分析型 agent
      return executeAnalyst(input);

    default:
      return simpleResponse(input);
  }
}
```

## 方案二：基于 LLM 的意图识别

### 核心思路
使用一个轻量级的 LLM（如 Claude Haiku）快速判断输入意图。

### 实现方式

```typescript
const intentClassifierPrompt = `You are an intent classifier. Analyze the user input and classify it into one of these categories:

Categories:
- GREETING: Simple greetings (e.g., "hi", "hello", "你好")
- CHITCHAT: Casual conversation without specific task
- META_QUESTION: Questions about the system itself
- SIMPLE_TASK: Single-step task in one domain
- COMPLEX_TASK: Multi-step task or cross-domain task
- QUERY: Information request or question

Respond with ONLY the category name.

User input: {input}

Category:`;

async function classifyIntent(input: string): Promise<InputType> {
  const response = await lightweightLLM.complete({
    model: "claude-haiku",
    messages: [
      { role: "user", content: intentClassifierPrompt.replace("{input}", input) }
    ],
    temperature: 0,
    maxTokens: 10,
  });

  return response.content.trim() as InputType;
}
```

### 优缺点

**优点**：
- ✅ 准确度高
- ✅ 能理解复杂语境
- ✅ 支持多语言

**缺点**：
- ❌ 需要额外的 LLM 调用
- ❌ 增加延迟
- ❌ 增加成本

## 方案三：混合方案（推荐）

### 核心思路
结合规则和 LLM，快速过滤 + 精确判断。

### 两阶段判断

```typescript
class HybridTaskClassifier {
  private ruleBasedClassifier = new TaskClassifier();
  private llmClassifier = new LLMIntentClassifier();

  async classify(input: string): Promise<{
    type: InputType;
    confidence: number;
    shouldUseOrchestrator: boolean;
  }> {
    // Stage 1: 快速规则过滤（0 成本）
    const quickResult = this.quickFilter(input);
    if (quickResult.confidence > 0.9) {
      return quickResult;
    }

    // Stage 2: LLM 精确判断（仅在不确定时）
    const llmResult = await this.llmClassifier.classify(input);
    return llmResult;
  }

  private quickFilter(input: string): ClassificationResult {
    // 1. 极短输入（<5 字符）
    if (input.length < 5) {
      return {
        type: InputType.GREETING,
        confidence: 0.95,
        shouldUseOrchestrator: false,
      };
    }

    // 2. 明确的非任务模式
    const nonTaskPatterns = [
      /^(你好|hi|hello)$/i,
      /^(谢谢|thanks)$/i,
    ];
    if (nonTaskPatterns.some(p => p.test(input))) {
      return {
        type: InputType.GREETING,
        confidence: 1.0,
        shouldUseOrchestrator: false,
      };
    }

    // 3. 明确的复杂任务信号
    const complexTaskSignals = [
      /实现.*并.*/, // "实现 X 并 Y"
      /研究.*然后.*/, // "研究 X 然后 Y"
      /分析.*生成.*/, // "分析 X 生成 Y"
    ];
    if (complexTaskSignals.some(p => p.test(input))) {
      return {
        type: InputType.COMPLEX_TASK,
        confidence: 0.9,
        shouldUseOrchestrator: true,
      };
    }

    // 4. 不确定，需要 LLM 判断
    return {
      type: InputType.UNKNOWN,
      confidence: 0.5,
      shouldUseOrchestrator: false,
    };
  }
}
```

## 方案四：基于上下文的任务判断

### 核心思路
考虑对话历史，判断当前输入是否是任务的延续。

### 上下文状态机

```typescript
enum ConversationState {
  IDLE = "idle",                    // 空闲状态
  IN_TASK = "in_task",              // 任务执行中
  AWAITING_CLARIFICATION = "awaiting_clarification", // 等待澄清
  TASK_COMPLETED = "task_completed", // 任务完成
}

class ContextualTaskClassifier {
  private state: ConversationState = ConversationState.IDLE;
  private currentTask: string | null = null;

  classify(input: string, history: Message[]): ClassificationResult {
    // 1. 如果正在执行任务
    if (this.state === ConversationState.IN_TASK) {
      // 判断是否是任务的补充说明
      if (this.isTaskContinuation(input)) {
        return {
          type: InputType.TASK_CONTINUATION,
          shouldUseOrchestrator: false, // 继续当前任务
        };
      }
    }

    // 2. 如果在等待澄清
    if (this.state === ConversationState.AWAITING_CLARIFICATION) {
      return {
        type: InputType.CLARIFICATION,
        shouldUseOrchestrator: false,
      };
    }

    // 3. 新任务判断
    return this.classifyNewInput(input);
  }

  private isTaskContinuation(input: string): boolean {
    const continuationPatterns = [
      /^(对|是的|没错|yes|correct)/i,
      /^(不|不是|no|nope)/i,
      /^(还要|另外|additionally)/i,
      /^(修改|改成|change to)/i,
    ];
    return continuationPatterns.some(p => p.test(input));
  }
}
```

## 方案五：基于任务特征的评分系统

### 核心思路
为输入的各个特征打分，综合判断是否是任务。

### 评分维度

```typescript
interface TaskScore {
  actionScore: number;        // 动作词得分 (0-10)
  complexityScore: number;    // 复杂度得分 (0-10)
  specificityScore: number;   // 具体性得分 (0-10)
  outputScore: number;        // 输出明确性得分 (0-10)
  domainScore: number;        // 领域明确性得分 (0-10)
}

class ScoringTaskClassifier {
  classify(input: string): ClassificationResult {
    const scores = this.calculateScores(input);
    const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
    const avgScore = totalScore / 5;

    // 评分阈值
    if (avgScore < 3) {
      return { type: InputType.CHITCHAT, confidence: 0.8 };
    } else if (avgScore < 6) {
      return { type: InputType.SIMPLE_TASK, confidence: 0.7 };
    } else {
      return { type: InputType.COMPLEX_TASK, confidence: 0.9 };
    }
  }

  private calculateScores(input: string): TaskScore {
    return {
      actionScore: this.scoreActionVerbs(input),
      complexityScore: this.scoreComplexity(input),
      specificityScore: this.scoreSpecificity(input),
      outputScore: this.scoreOutputClarity(input),
      domainScore: this.scoreDomainClarity(input),
    };
  }

  private scoreActionVerbs(input: string): number {
    const actionVerbs = ["实现", "创建", "编写", "分析", "计算"];
    const count = actionVerbs.filter(v => input.includes(v)).length;
    return Math.min(count * 3, 10);
  }

  private scoreComplexity(input: string): number {
    const indicators = ["并且", "然后", "同时", "首先"];
    const count = indicators.filter(i => input.includes(i)).length;
    return Math.min(count * 4, 10);
  }

  private scoreSpecificity(input: string): number {
    // 是否包含具体的技术栈、数字、文件名等
    const hasNumbers = /\d+/.test(input);
    const hasTechStack = /(TypeScript|Python|React|Node\.js)/i.test(input);
    const hasFileName = /\.(ts|js|py|md|json)/.test(input);

    let score = 0;
    if (hasNumbers) score += 3;
    if (hasTechStack) score += 4;
    if (hasFileName) score += 3;
    return Math.min(score, 10);
  }

  private scoreOutputClarity(input: string): number {
    // 是否明确说明了期望的输出
    const outputIndicators = [
      "生成", "输出", "返回", "创建", "实现",
      "generate", "output", "return", "create"
    ];
    const hasOutput = outputIndicators.some(i => input.includes(i));
    return hasOutput ? 8 : 3;
  }

  private scoreDomainClarity(input: string): number {
    // 是否明确属于某个领域
    const domains = {
      code: ["代码", "编程", "code"],
      research: ["研究", "分析", "research"],
      math: ["计算", "数学", "math"],
    };

    const matchedDomains = Object.values(domains).filter(keywords =>
      keywords.some(k => input.includes(k))
    );

    return Math.min(matchedDomains.length * 5, 10);
  }
}
```

## 推荐方案：混合 + 评分

### 最终实现

```typescript
class ProductionTaskClassifier {
  async classify(input: string, context?: ConversationContext): Promise<{
    isTask: boolean;
    taskType: InputType;
    confidence: number;
    shouldUseOrchestrator: boolean;
    reasoning: string;
  }> {
    // Step 1: 快速规则过滤（极端情况）
    const quickResult = this.quickFilter(input);
    if (quickResult.confidence > 0.95) {
      return quickResult;
    }

    // Step 2: 特征评分
    const scores = this.calculateTaskScores(input);
    const avgScore = this.getAverageScore(scores);

    // Step 3: 上下文判断
    if (context) {
      const contextAdjustment = this.adjustForContext(avgScore, context);
      avgScore = contextAdjustment.score;
    }

    // Step 4: 最终判断
    return this.makeDecision(avgScore, scores);
  }
}
```

## 总结与建议

### 推荐实现顺序

1. **Phase 1**: 实现基础规则分类器（方案一）
   - 快速、零成本
   - 覆盖 80% 的明确情况

2. **Phase 2**: 添加评分系统（方案五）
   - 处理模糊情况
   - 提供置信度

3. **Phase 3**: 集成 LLM 分类器（方案二）
   - 仅在低置信度时使用
   - 提高准确率

4. **Phase 4**: 添加上下文感知（方案四）
   - 处理多轮对话
   - 任务延续判断

### 关键指标

- **准确率**: > 90%
- **响应时间**: < 100ms（规则）/ < 500ms（LLM）
- **成本**: 尽量使用规则，减少 LLM 调用

### 下一步

你觉得哪个方案最适合当前项目？我可以开始实现具体的代码。
