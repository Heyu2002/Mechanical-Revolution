/**
 * Complete Task Decomposition and Assignment Demo
 *
 * 展示完整的任务处理流程：
 * 1. 任务复杂度判断（是否需要分解）
 * 2. 任务分配（找到最合适的 Agent）
 * 3. Orchestrator 协调（复杂任务的分解和执行）
 */

import {
  defineAgent,
  createComplexityClassifier,
  createAgentMatcher,
  createOrchestratorInstructions,
  handoff,
  type AgentConfig,
} from "../src/index.js";

console.log("=== Complete Task Decomposition and Assignment Demo ===\n");

// ══════════════════════════════════════════════════════════════
// Step 1: 定义专家 Agent
// ══════════════════════════════════════════════════════════════

const claudeOpusAgent = defineAgent({
  name: "claude-opus-coder",
  instructions: "You are Claude Opus 4, specialized in coding tasks.",
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
    languages: ["TypeScript", "Python", "Rust", "Go", "JavaScript"],
    bestFor: [
      "复杂功能实现",
      "大型代码重构",
      "算法优化",
      "数据结构设计",
      "二叉树",
      "链表",
      "排序算法",
    ],
    limitations: ["不能执行 web 搜索", "不能进行复杂数学证明"],
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
    languages: ["English", "Chinese"],
    bestFor: [
      "复杂问题分析",
      "数据统计计算",
      "信息检索和综合",
      "逻辑推理",
      "数学计算",
    ],
    limitations: ["代码生成能力不如 Claude Opus"],
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
    languages: ["Chinese", "English"],
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

console.log("✓ Defined 3 specialist agents\n");

// ══════════════════════════════════════════════════════════════
// Step 2: 创建 Orchestrator Agent
// ══════════════════════════════════════════════════════════════

const orchestratorAgent = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions(allAgents),
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  handoffs: [
    handoff(claudeOpusAgent, "Delegate coding tasks to Claude Opus"),
    handoff(claudeSonnetAgent, "Delegate analysis tasks to Claude Sonnet"),
    handoff(doubaoAgent, "Delegate Chinese/image tasks to Doubao"),
  ],
});

console.log("✓ Created orchestrator agent with handoffs\n");

// ══════════════════════════════════════════════════════════════
// Step 3: 创建分类器和匹配器
// ══════════════════════════════════════════════════════════════

const complexityClassifier = createComplexityClassifier();
const agentMatcher = createAgentMatcher(allAgents);

console.log("✓ Created complexity classifier and agent matcher\n");

// ══════════════════════════════════════════════════════════════
// Step 4: 定义决策流程
// ══════════════════════════════════════════════════════════════

interface TaskDecision {
  input: string;
  complexity: number;
  decision: string;
  shouldDecompose: boolean;
  bestAgent: string;
  shouldHandoff: boolean;
  recommendation: string;
}

function analyzeTask(input: string, currentAgent: AgentConfig): TaskDecision {
  // 1. 任务复杂度判断
  const complexityResult = complexityClassifier.classify(input);

  // 2. Agent 匹配
  const matchResult = agentMatcher.findBestAgent(input, currentAgent, allAgents);

  // 3. 决策逻辑
  let recommendation: string;

  if (complexityResult.shouldDecompose) {
    // 复杂任务 → 需要 Orchestrator 分解
    recommendation = `启动 Orchestrator 进行任务分解`;
  } else if (matchResult.shouldHandoff) {
    // 简单任务但需要切换 Agent
    recommendation = `直接切换到 ${matchResult.bestAgent.name}`;
  } else {
    // 简单任务且当前 Agent 合适
    recommendation = `当前 Agent 直接处理`;
  }

  return {
    input,
    complexity: complexityResult.complexity,
    decision: complexityResult.decision,
    shouldDecompose: complexityResult.shouldDecompose,
    bestAgent: matchResult.bestAgent.name,
    shouldHandoff: matchResult.shouldHandoff,
    recommendation,
  };
}

// ══════════════════════════════════════════════════════════════
// Step 5: 测试用例
// ══════════════════════════════════════════════════════════════

const testCases = [
  {
    input: "你好",
    currentAgent: claudeOpusAgent,
    description: "简单问候",
  },
  {
    input: "帮我实现一个二叉树遍历算法",
    currentAgent: doubaoAgent,
    description: "中等编码任务 - 需要切换 Agent",
  },
  {
    input: "分析这张图片中的文字内容",
    currentAgent: claudeOpusAgent,
    description: "中等图像任务 - 需要切换 Agent",
  },
  {
    input: "研究 React 19 的新特性，然后创建示例组件，并编写测试用例",
    currentAgent: claudeOpusAgent,
    description: "复杂任务 - 需要 Orchestrator 分解",
  },
  {
    input: "首先分析这个数据集的统计特征，然后用 Python 实现机器学习模型，最后生成可视化报告",
    currentAgent: doubaoAgent,
    description: "复杂跨域任务 - 需要 Orchestrator 分解",
  },
];

console.log("─── Task Analysis Results ───\n");

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.description}`);
  console.log(`Input: "${testCase.input}"`);
  console.log(`Current Agent: ${testCase.currentAgent.name}`);

  const decision = analyzeTask(testCase.input, testCase.currentAgent);

  console.log(`\nAnalysis:`);
  console.log(`  - Complexity: ${decision.complexity.toFixed(1)}/100`);
  console.log(`  - Decision: ${decision.decision}`);
  console.log(`  - Should Decompose: ${decision.shouldDecompose ? "Yes" : "No"}`);
  console.log(`  - Best Agent: ${decision.bestAgent}`);
  console.log(`  - Should Handoff: ${decision.shouldHandoff ? "Yes" : "No"}`);
  console.log(`  - Recommendation: ${decision.recommendation}`);

  console.log("\n" + "─".repeat(80) + "\n");
});

// ══════════════════════════════════════════════════════════════
// Step 6: 展示决策流程图
// ══════════════════════════════════════════════════════════════

console.log("─── Decision Flow ───\n");
console.log(`
用户输入
    ↓
[任务复杂度判断] ← TaskComplexityClassifier
    ↓
    ├─→ complexity < 48 → 简单/中等任务
    │       ↓
    │   [Agent 匹配] ← TFIDFAgentMatcher
    │       ↓
    │       ├─→ 当前 Agent 合适 → 直接处理
    │       └─→ 需要切换 Agent → Handoff 到最佳 Agent
    │
    └─→ complexity ≥ 48 → 复杂任务
            ↓
        [Orchestrator] ← 任务分解和协调
            ↓
            ├─→ 子任务 1 → Agent A
            ├─→ 子任务 2 → Agent B
            └─→ 子任务 3 → Agent C
                ↓
            [结果聚合] → 返回给用户
`);

console.log("─── Key Components ───\n");
console.log("1. TaskComplexityClassifier");
console.log("   - 基于回归方程计算任务复杂度");
console.log("   - 决策阈值: complexity ≥ 48 需要分解");
console.log("   - 考虑语言、结构、上下文、语义四个维度");
console.log("");
console.log("2. TFIDFAgentMatcher");
console.log("   - 基于 TF-IDF 和余弦相似度匹配 Agent");
console.log("   - 自动从 Agent 能力描述中学习");
console.log("   - 决策阈值: 相似度差 > 0.15 才切换");
console.log("");
console.log("3. Orchestrator");
console.log("   - 分解复杂任务为子任务");
console.log("   - 使用 TFIDFAgentMatcher 为每个子任务分配 Agent");
console.log("   - 通过 Handoff 机制协调多个 Agent");
console.log("   - 聚合结果并返回给用户");

console.log("\n─── Demo Complete ───");
console.log("\n💡 Next Steps:");
console.log("  1. 配置 API keys in config/config.json");
console.log("  2. 运行实际的任务执行（需要 Runner）");
console.log("  3. 观察 Orchestrator 如何分解和协调任务");
