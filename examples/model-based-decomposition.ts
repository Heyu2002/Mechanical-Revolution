/**
 * Mechanical Revolution — Model-Based Task Decomposition Demo
 *
 * 展示 Orchestrator 根据不同 LLM 模型的特性来分配任务。
 * 不再是按角色（researcher, coder）分配，而是按模型能力分配。
 *
 * 模型配置：
 * - Claude Opus 4: 编码能力突出，擅长长代码生成和复杂逻辑
 * - Claude Sonnet 4: 平衡性能，擅长推理和分析
 * - Doubao: 中文理解能力强，擅长中文内容处理
 *
 * Usage:
 *   npx tsx examples/model-based-decomposition.ts
 */

import {
  defineAgent,
  defineTool,
  handoff,
  Runner,
  loadConfig,
  registerBuiltinProviders,
  createContext,
  createOrchestratorInstructions,
} from "../src/index.js";
import { z } from "zod";

// ── Load config ──
const config = loadConfig();
registerBuiltinProviders();

// ── Tools ──

const searchTool = defineTool({
  name: "web_search",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    // Simulated search results
    if (query.toLowerCase().includes("react")) {
      return {
        results: [
          "[Simulated] React 19 introduces Server Components for better performance",
          "[Simulated] New features: async components, improved hydration",
        ],
      };
    }
    return {
      results: [
        `[Simulated] Search results for "${query}"`,
        `[Simulated] More information about ${query}`,
      ],
    };
  },
});

const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform mathematical calculations",
  parameters: z.object({
    expression: z.string().describe("Math expression"),
  }),
  execute: async ({ expression }) => {
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return { result: String(result) };
    } catch (err) {
      return { error: "Invalid expression", details: String(err) };
    }
  },
});

// ── Model-Based Agents ──

// Claude Opus 4 - 编码专家
const claudeOpusAgent = defineAgent({
  name: "claude-opus-coder",
  instructions: `You are Claude Opus 4, a powerful AI model with exceptional coding capabilities.

Your strengths:
- Writing long, complex code with excellent structure
- Handling intricate logic and algorithms
- Multi-language support (TypeScript, Python, Rust, Go, etc.)
- Architecture design and best practices

When you receive a task:
- Write clean, production-ready code
- Include comprehensive comments
- Follow best practices and design patterns
- Explain your implementation decisions`,
  provider: "anthropic",
  model: "claude-opus-4-20250514",
  capabilities: {
    summary: "Claude Opus 4 - 编码能力突出，擅长复杂代码生成",
    modelStrengths: [
      "长代码生成",
      "复杂逻辑处理",
      "架构设计",
      "多语言支持",
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
      "Java",
      "C++",
    ],
    bestFor: [
      "复杂功能实现",
      "大型代码重构",
      "算法优化",
      "系统架构设计",
    ],
    limitations: [
      "不能执行 web 搜索",
      "不能进行复杂数学证明",
    ],
  },
});

// Claude Sonnet 4 - 推理和分析专家
const claudeSonnetAgent = defineAgent({
  name: "claude-sonnet-analyst",
  instructions: `You are Claude Sonnet 4, an advanced AI model with exceptional reasoning and analytical capabilities.

Your strengths:
- Logical reasoning and problem decomposition
- Data analysis and statistical thinking
- Research and information synthesis
- Multi-step problem solving
- Balanced performance across various tasks

When you receive a task:
- Break down complex problems systematically
- Provide clear, logical explanations
- Use available tools (search, calculator) effectively
- Present findings in a structured format`,
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  tools: [searchTool, calculatorTool],
  capabilities: {
    summary: "Claude Sonnet 4 - 推理和分析能力强，擅长问题分解和数据分析",
    modelStrengths: [
      "逻辑推理",
      "问题分解",
      "数据分析",
      "信息综合",
      "平衡性能",
    ],
    taskTypes: [
      "research",
      "analysis",
      "reasoning",
      "calculation",
      "information_synthesis",
    ],
    languages: [
      "English",
      "Chinese",
      "多语言支持",
    ],
    bestFor: [
      "复杂问题分析",
      "数据统计计算",
      "信息检索和综合",
      "逻辑推理任务",
    ],
    limitations: [
      "代码生成能力不如 Claude Opus",
      "长代码处理可能不够精细",
    ],
  },
});

// Doubao - 中文理解和图像处理专家
const doubaoAgent = defineAgent({
  name: "doubao-chinese-vision",
  instructions: `你是豆包（Doubao），一个在中文理解和图像处理方面表现出色的 AI 模型。

你的优势：
- 深度理解中文语境和文化
- 自然流畅的中文表达
- 中文内容创作和润色
- 图像理解和分析能力
- 图文结合处理

当你收到任务时：
- 充分理解中文语境和隐含意义
- 使用地道的中文表达
- 注意文化差异和习惯用法
- 对于图像相关任务，提供详细的视觉分析
- 提供符合中文习惯的输出`,
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
    ],
    taskTypes: [
      "chinese_writing",
      "translation",
      "content_creation",
      "text_polishing",
      "image_analysis",
      "image_description",
    ],
    languages: [
      "Chinese (优势)",
      "English",
    ],
    bestFor: [
      "中文文案创作",
      "中文内容润色",
      "中英翻译",
      "中文语境理解",
      "图像内容分析",
      "图文结合任务",
    ],
    limitations: [
      "编码能力相对较弱",
      "复杂逻辑推理不如 Claude Sonnet",
      "图像生成能力有限（主要是理解和分析）",
    ],
  },
});

// ── Orchestrator Agent ──

const allAgents = [claudeOpusAgent, claudeSonnetAgent, doubaoAgent];

const orchestratorAgent = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions(allAgents),
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  handoffs: [
    handoff(claudeOpusAgent, {
      description: "Delegate to Claude Opus 4 for complex coding tasks",
    }),
    handoff(claudeSonnetAgent, {
      description: "Delegate to Claude Sonnet 4 for analysis and research tasks",
    }),
    handoff(doubaoAgent, {
      description: "Delegate to Doubao for Chinese content tasks",
    }),
  ],
});

// ── Run ──

async function main() {
  const runner = new Runner(config, [orchestratorAgent, ...allAgents]);

  console.log("=== Model-Based Task Decomposition Demo ===\n");
  console.log("Available Models:");
  console.log("  🤖 Claude Opus 4    → 编码能力突出");
  console.log("  🤖 Claude Sonnet 4  → 推理和分析能力强");
  console.log("  🤖 Doubao           → 中文理解能力强 + 图像处理");
  console.log();

  // Test 1: 编码任务 → 应该分配给 Claude Opus
  console.log("─── Test 1: 编码任务 ───");
  console.log('Input: "实现一个 TypeScript 的二叉搜索树，包含插入、删除、查找功能"\n');

  const ctx1 = createContext();
  const result1 = await runner.run(
    orchestratorAgent,
    "实现一个 TypeScript 的二叉搜索树，包含插入、删除、查找功能",
    ctx1
  );

  console.log(`\n✓ Final output (from ${result1.lastAgent}):\n${result1.output}\n`);
  console.log(`Task flow: ${result1.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  // Test 2: 分析任务 → 应该分配给 Claude Sonnet
  console.log("─── Test 2: 分析任务 ───");
  console.log('Input: "分析一下为什么 React Server Components 能提升性能"\n');

  const ctx2 = createContext();
  const result2 = await runner.run(
    orchestratorAgent,
    "分析一下为什么 React Server Components 能提升性能",
    ctx2
  );

  console.log(`\n✓ Final output (from ${result2.lastAgent}):\n${result2.output}\n`);
  console.log(`Task flow: ${result2.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  // Test 3: 中文内容任务 → 应该分配给 Doubao
  console.log("─── Test 3: 中文内容任务 ───");
  console.log('Input: "写一篇关于人工智能发展的中文短文，要求语言优美流畅"\n');

  const ctx3 = createContext();
  const result3 = await runner.run(
    orchestratorAgent,
    "写一篇关于人工智能发展的中文短文，要求语言优美流畅",
    ctx3
  );

  console.log(`\n✓ Final output (from ${result3.lastAgent}):\n${result3.output}\n`);
  console.log(`Task flow: ${result3.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  // Test 4: 复合任务 → 应该分配给多个模型
  console.log("─── Test 4: 复合任务（分析 + 编码）───");
  console.log('Input: "研究快速排序算法的时间复杂度，然后用 Python 实现"\n');

  const ctx4 = createContext();
  const result4 = await runner.run(
    orchestratorAgent,
    "研究快速排序算法的时间复杂度，然后用 Python 实现",
    ctx4
  );

  console.log(`\n✓ Final output (from ${result4.lastAgent}):\n${result4.output}\n`);
  console.log(`Task flow: ${result4.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  // Test 5: 图像分析任务 → 应该分配给 Doubao
  console.log("─── Test 5: 图像分析任务 ───");
  console.log('Input: "描述一下这张图片的内容，并用中文总结要点"\n');

  const ctx5 = createContext();
  const result5 = await runner.run(
    orchestratorAgent,
    "描述一下这张图片的内容，并用中文总结要点（假设图片显示的是一个现代化的办公室）",
    ctx5
  );

  console.log(`\n✓ Final output (from ${result5.lastAgent}):\n${result5.output}\n`);
  console.log(`Task flow: ${result5.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  console.log("✅ All tests completed!");
  console.log("\n💡 观察：Orchestrator 根据任务类型选择了最合适的模型");
  console.log("  - 编码任务 → Claude Opus 4");
  console.log("  - 分析任务 → Claude Sonnet 4");
  console.log("  - 中文内容 → Doubao");
  console.log("  - 图像分析 → Doubao");
}

main().catch(console.error);
  createOrchestratorInstructions,
} from "../src/index.js";
import { z } from "zod";

// ── Load config ──
const config = loadConfig();
registerBuiltinProviders();

// ── Tools ──

const searchTool = defineTool({
  name: "web_search",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    // Simulated search results
    if (query.toLowerCase().includes("react")) {
      return {
        results: [
          "[Simulated] React 19 introduces Server Components for better performance",
          "[Simulated] New features: async components, improved hydration",
        ],
      };
    }
    return {
      results: [
        `[Simulated] Search results for "${query}"`,
        `[Simulated] More information about ${query}`,
      ],
    };
  },
});

const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform mathematical calculations",
  parameters: z.object({
    expression: z.string().describe("Math expression"),
  }),
  execute: async ({ expression }) => {
    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return { result: String(result) };
    } catch (err) {
      return { error: "Invalid expression", details: String(err) };
    }
  },
});

// ── Model-Based Agents ──

// Claude Opus 4 - 编码专家
const claudeOpusAgent = defineAgent({
  name: "claude-opus-coder",
  instructions: `You are Claude Opus 4, a powerful AI model with exceptional coding capabilities.

Your strengths:
- Writing long, complex code with excellent structure
- Handling intricate logic and algorithms
- Multi-language support (TypeScript, Python, Rust, Go, etc.)
- Architecture design and best practices

When you receive a task:
- Write clean, production-ready code
- Include comprehensive comments
- Follow best practices and design patterns
- Explain your implementation decisions`,
  provider: "anthropic",
  model: "claude-opus-4-20250514",
  capabilities: {
    summary: "Claude Opus 4 - 编码能力突出，擅长复杂代码生成",
    modelStrengths: [
      "长代码生成",
      "复杂逻辑处理",
      "架构设计",
      "多语言支持",
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
      "Java",
      "C++",
    ],
    bestFor: [
      "复杂功能实现",
      "大型代码重构",
      "算法优化",
      "系统架构设计",
    ],
    limitations: [
      "不能执行 web 搜索",
      "不能进行复杂数学证明",
    ],
  },
});

// GPT-4o - 推理和分析专家
const gpt4AnalystAgent = defineAgent({
  name: "gpt4-analyst",
  instructions: `You are GPT-4o, an advanced AI model with exceptional reasoning and analytical capabilities.

Your strengths:
- Logical reasoning and problem decomposition
- Data analysis and statistical thinking
- Research and information synthesis
- Multi-step problem solving

When you receive a task:
- Break down complex problems systematically
- Provide clear, logical explanations
- Use available tools (search, calculator) effectively
- Present findings in a structured format`,
  provider: "openai",
  model: "gpt-4o",
  tools: [searchTool, calculatorTool],
  capabilities: {
    summary: "GPT-4o - 推理和分析能力强，擅长问题分解和数据分析",
    modelStrengths: [
      "逻辑推理",
      "问题分解",
      "数据分析",
      "信息综合",
    ],
    taskTypes: [
      "research",
      "analysis",
      "reasoning",
      "calculation",
      "information_synthesis",
    ],
    languages: [
      "English",
      "Chinese",
      "多语言支持",
    ],
    bestFor: [
      "复杂问题分析",
      "数据统计计算",
      "信息检索和综合",
      "逻辑推理任务",
    ],
    limitations: [
      "代码生成能力不如 Claude Opus",
      "长代码处理可能不够精细",
    ],
  },
});

// Doubao - 中文理解专家
const doubaoAgent = defineAgent({
  name: "doubao-chinese",
  instructions: `你是豆包（Doubao），一个在中文理解和生成方面表现出色的 AI 模型。

你的优势：
- 深度理解中文语境和文化
- 自然流畅的中文表达
- 中文内容创作和润色
- 中文信息处理

当你收到任务时：
- 充分理解中文语境和隐含意义
- 使用地道的中文表达
- 注意文化差异和习惯用法
- 提供符合中文习惯的输出`,
  provider: "doubao",
  model: "doubao-seed-2-0-pro-260215",
  capabilities: {
    summary: "Doubao - 中文理解能力强，擅长中文内容处理",
    modelStrengths: [
      "中文语境理解",
      "中文内容创作",
      "文化适配",
      "自然语言处理",
    ],
    taskTypes: [
      "chinese_writing",
      "translation",
      "content_creation",
      "text_polishing",
    ],
    languages: [
      "Chinese (优势)",
      "English",
    ],
    bestFor: [
      "中文文案创作",
      "中文内容润色",
      "中英翻译",
      "中文语境理解",
    ],
    limitations: [
      "编码能力相对较弱",
      "复杂逻辑推理不如 GPT-4o",
    ],
  },
});

// ── Orchestrator Agent ──

const allAgents = [claudeOpusAgent, gpt4AnalystAgent, doubaoAgent];

const orchestratorAgent = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions(allAgents),
  provider: "openai",
  model: "gpt-4o",
  handoffs: [
    handoff(claudeOpusAgent, {
      description: "Delegate to Claude Opus 4 for complex coding tasks",
    }),
    handoff(gpt4AnalystAgent, {
      description: "Delegate to GPT-4o for analysis and research tasks",
    }),
    handoff(doubaoAgent, {
      description: "Delegate to Doubao for Chinese content tasks",
    }),
  ],
});

// ── Run ──

async function main() {
  const runner = new Runner(config, [orchestratorAgent, ...allAgents]);

  console.log("=== Model-Based Task Decomposition Demo ===\n");
  console.log("Available Models:");
  console.log("  🤖 Claude Opus 4    → 编码能力突出");
  console.log("  🤖 GPT-4o          → 推理和分析能力强");
  console.log("  🤖 Doubao          → 中文理解能力强");
  console.log();

  // Test 1: 编码任务 → 应该分配给 Claude Opus
  console.log("─── Test 1: 编码任务 ───");
  console.log('Input: "实现一个 TypeScript 的二叉搜索树，包含插入、删除、查找功能"\n');

  const ctx1 = createContext();
  const result1 = await runner.run(
    orchestratorAgent,
    "实现一个 TypeScript 的二叉搜索树，包含插入、删除、查找功能",
    ctx1
  );

  console.log(`\n✓ Final output (from ${result1.lastAgent}):\n${result1.output}\n`);
  console.log(`Task flow: ${result1.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  // Test 2: 分析任务 → 应该分配给 GPT-4o
  console.log("─── Test 2: 分析任务 ───");
  console.log('Input: "分析一下为什么 React Server Components 能提升性能"\n');

  const ctx2 = createContext();
  const result2 = await runner.run(
    orchestratorAgent,
    "分析一下为什么 React Server Components 能提升性能",
    ctx2
  );

  console.log(`\n✓ Final output (from ${result2.lastAgent}):\n${result2.output}\n`);
  console.log(`Task flow: ${result2.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  // Test 3: 中文内容任务 → 应该分配给 Doubao
  console.log("─── Test 3: 中文内容任务 ───");
  console.log('Input: "写一篇关于人工智能发展的中文短文，要求语言优美流畅"\n');

  const ctx3 = createContext();
  const result3 = await runner.run(
    orchestratorAgent,
    "写一篇关于人工智能发展的中文短文，要求语言优美流畅",
    ctx3
  );

  console.log(`\n✓ Final output (from ${result3.lastAgent}):\n${result3.output}\n`);
  console.log(`Task flow: ${result3.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  // Test 4: 复合任务 → 应该分配给多个模型
  console.log("─── Test 4: 复合任务（分析 + 编码）───");
  console.log('Input: "研究快速排序算法的时间复杂度，然后用 Python 实现"\n');

  const ctx4 = createContext();
  const result4 = await runner.run(
    orchestratorAgent,
    "研究快速排序算法的时间复杂度，然后用 Python 实现",
    ctx4
  );

  console.log(`\n✓ Final output (from ${result4.lastAgent}):\n${result4.output}\n`);
  console.log(`Task flow: ${result4.flow.tasks.map(t => t.targetAgent).join(' → ')}\n`);
  console.log("─".repeat(60) + "\n");

  console.log("✅ All tests completed!");
  console.log("\n💡 观察：Orchestrator 根据任务类型选择了最合适的模型");
}

main().catch(console.error);
