# 基于模型特性的任务分解 - 快速开始

## 🎯 核心概念

**不再按角色分配任务，而是根据 LLM 模型的具体优势来分配！**

- Claude Opus 4 → 编码能力突出
- Claude Sonnet 4 → 推理和分析能力强
- Doubao → 中文理解能力强 + 图像处理能力

## 🚀 快速测试

```bash
# 1. 测试核心功能（无需 API key）
npx tsx examples/test-model-based.ts

# 2. 运行完整示例（需要 API key）
npx tsx examples/model-based-decomposition.ts
```

## 📝 定义模型 Agent

```typescript
import { defineAgent } from "mechanical-revolution";

// Claude Opus 4 - 编码专家
const claudeOpusAgent = defineAgent({
  name: "claude-opus-coder",
  provider: "anthropic",
  model: "claude-opus-4-20250514",
  capabilities: {
    summary: "Claude Opus 4 - 编码能力突出，擅长复杂代码生成",
    modelStrengths: ["长代码生成", "复杂逻辑处理", "架构设计"],
    taskTypes: ["code_writing", "debugging", "refactoring"],
    languages: ["TypeScript", "Python", "Rust", "Go"],
    bestFor: ["复杂功能实现", "大型代码重构", "算法优化"],
    limitations: ["不能执行 web 搜索"],
  },
});

// Claude Sonnet 4 - 分析专家
const claudeSonnetAgent = defineAgent({
  name: "claude-sonnet-analyst",
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  capabilities: {
    summary: "Claude Sonnet 4 - 推理和分析能力强",
    modelStrengths: ["逻辑推理", "问题分解", "数据分析"],
    taskTypes: ["research", "analysis", "reasoning", "calculation"],
    bestFor: ["复杂问题分析", "数据统计计算"],
    limitations: ["代码生成能力不如 Claude Opus"],
  },
});

// Doubao - 中文和图像处理专家
const doubaoAgent = defineAgent({
  name: "doubao-chinese-vision",
  provider: "doubao",
  model: "doubao-seed-2-0-pro-260215",
  capabilities: {
    summary: "Doubao - 中文理解能力强，擅长中文内容处理和图像分析",
    modelStrengths: ["中文语境理解", "中文内容创作", "文化适配", "图像理解和分析"],
    taskTypes: ["chinese_writing", "translation", "content_creation", "image_analysis"],
    languages: ["Chinese (优势)", "English"],
    bestFor: ["中文文案创作", "中文内容润色", "图像内容分析", "图文结合任务"],
    limitations: ["编码能力相对较弱", "图像生成能力有限（主要是理解和分析）"],
  },
});
```

## 🎯 创建 Orchestrator

```typescript
import { createOrchestratorInstructions, handoff } from "mechanical-revolution";

const allAgents = [claudeOpusAgent, claudeSonnetAgent, doubaoAgent];

const orchestrator = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions(allAgents),
  provider: "anthropic",
  model: "claude-sonnet-4-20250514",
  handoffs: [
    handoff(claudeOpusAgent, { description: "Delegate to Claude Opus for coding" }),
    handoff(claudeSonnetAgent, { description: "Delegate to Claude Sonnet for analysis" }),
    handoff(doubaoAgent, { description: "Delegate to Doubao for Chinese" }),
  ],
});
```

## 🎬 运行任务

```typescript
const runner = new Runner(config, [orchestrator, ...allAgents]);

// 编码任务 → Claude Opus
await runner.run(orchestrator, "实现一个 TypeScript 的二叉搜索树");

// 分析任务 → Claude Sonnet
await runner.run(orchestrator, "分析为什么 React Server Components 能提升性能");

// 中文任务 → Doubao
await runner.run(orchestrator, "写一篇关于人工智能发展的中文短文");

// 复合任务 → 多个模型协作
await runner.run(orchestrator, "研究快速排序算法，然后用 Python 实现");
```

## 📊 Orchestrator 如何选择模型

Orchestrator 会看到每个模型的详细信息：

```
**claude-opus-coder** (anthropic/claude-opus-4):
- Summary: Claude Opus 4 - 编码能力突出
- Model Strengths: 长代码生成, 复杂逻辑处理, 架构设计
- Task Types: code_writing, debugging, refactoring
- Best For: 复杂功能实现; 大型代码重构

**claude-sonnet-analyst** (anthropic/claude-sonnet-4):
- Summary: Claude Sonnet 4 - 推理和分析能力强
- Model Strengths: 逻辑推理, 问题分解, 数据分析
- Task Types: research, analysis, reasoning
- Best For: 复杂问题分析; 数据统计计算
```

然后根据任务需求选择最合适的模型！

## 💡 关键字段说明

- **summary**: 模型的核心优势（一句话）
- **modelStrengths**: 模型的具体优势
- **taskTypes**: 擅长的任务类型
- **languages**: 擅长的编程语言或自然语言
- **bestFor**: 最适合的具体场景
- **limitations**: 模型的局限性

## 📚 完整文档

- **详细说明**: `MODEL_BASED_UPDATE.md`
- **完整示例**: `examples/model-based-decomposition.ts`
- **测试代码**: `examples/test-model-based.ts`

---

🎉 **开始使用基于模型特性的任务分解系统！**

## 🚀 快速测试

```bash
# 1. 测试核心功能（无需 API key）
npx tsx examples/test-model-based.ts

# 2. 运行完整示例（需要 API key）
npx tsx examples/model-based-decomposition.ts
```

## 📝 定义模型 Agent

```typescript
import { defineAgent } from "mechanical-revolution";

// Claude Opus 4 - 编码专家
const claudeAgent = defineAgent({
  name: "claude-opus-coder",
  provider: "anthropic",
  model: "claude-opus-4-20250514",
  capabilities: {
    summary: "Claude Opus 4 - 编码能力突出，擅长复杂代码生成",
    modelStrengths: ["长代码生成", "复杂逻辑处理", "架构设计"],
    taskTypes: ["code_writing", "debugging", "refactoring"],
    languages: ["TypeScript", "Python", "Rust", "Go"],
    bestFor: ["复杂功能实现", "大型代码重构", "算法优化"],
    limitations: ["不能执行 web 搜索"],
  },
});

// GPT-4o - 分析专家
const gpt4Agent = defineAgent({
  name: "gpt4-analyst",
  provider: "openai",
  model: "gpt-4o",
  capabilities: {
    summary: "GPT-4o - 推理和分析能力强",
    modelStrengths: ["逻辑推理", "问题分解", "数据分析"],
    taskTypes: ["research", "analysis", "reasoning", "calculation"],
    bestFor: ["复杂问题分析", "数据统计计算"],
    limitations: ["代码生成能力不如 Claude Opus"],
  },
});

// Doubao - 中文和图像处理专家
const doubaoAgent = defineAgent({
  name: "doubao-chinese-vision",
  provider: "doubao",
  model: "doubao-seed-2-0-pro-260215",
  capabilities: {
    summary: "Doubao - 中文理解能力强，擅长中文内容处理和图像分析",
    modelStrengths: ["中文语境理解", "中文内容创作", "文化适配", "图像理解和分析"],
    taskTypes: ["chinese_writing", "translation", "content_creation", "image_analysis"],
    languages: ["Chinese (优势)", "English"],
    bestFor: ["中文文案创作", "中文内容润色", "图像内容分析", "图文结合任务"],
    limitations: ["编码能力相对较弱", "图像生成能力有限（主要是理解和分析）"],
  },
});
```

## 🎯 创建 Orchestrator

```typescript
import { createOrchestratorInstructions, handoff } from "mechanical-revolution";

const allAgents = [claudeAgent, gpt4Agent, doubaoAgent];

const orchestrator = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions(allAgents),
  provider: "openai",
  model: "gpt-4o",
  handoffs: [
    handoff(claudeAgent, { description: "Delegate to Claude for coding" }),
    handoff(gpt4Agent, { description: "Delegate to GPT-4o for analysis" }),
    handoff(doubaoAgent, { description: "Delegate to Doubao for Chinese" }),
  ],
});
```

## 🎬 运行任务

```typescript
const runner = new Runner(config, [orchestrator, ...allAgents]);

// 编码任务 → Claude Opus
await runner.run(orchestrator, "实现一个 TypeScript 的二叉搜索树");

// 分析任务 → GPT-4o
await runner.run(orchestrator, "分析为什么 React Server Components 能提升性能");

// 中文任务 → Doubao
await runner.run(orchestrator, "写一篇关于人工智能发展的中文短文");

// 复合任务 → 多个模型协作
await runner.run(orchestrator, "研究快速排序算法，然后用 Python 实现");
```

## 📊 Orchestrator 如何选择模型

Orchestrator 会看到每个模型的详细信息：

```
**claude-opus-coder** (anthropic/claude-opus-4):
- Summary: Claude Opus 4 - 编码能力突出
- Model Strengths: 长代码生成, 复杂逻辑处理, 架构设计
- Task Types: code_writing, debugging, refactoring
- Best For: 复杂功能实现; 大型代码重构

**gpt4-analyst** (openai/gpt-4o):
- Summary: GPT-4o - 推理和分析能力强
- Model Strengths: 逻辑推理, 问题分解, 数据分析
- Task Types: research, analysis, reasoning
- Best For: 复杂问题分析; 数据统计计算
```

然后根据任务需求选择最合适的模型！

## 💡 关键字段说明

- **summary**: 模型的核心优势（一句话）
- **modelStrengths**: 模型的具体优势
- **taskTypes**: 擅长的任务类型
- **languages**: 擅长的编程语言或自然语言
- **bestFor**: 最适合的具体场景
- **limitations**: 模型的局限性

## 📚 完整文档

- **详细说明**: `MODEL_BASED_UPDATE.md`
- **完整示例**: `examples/model-based-decomposition.ts`
- **测试代码**: `examples/test-model-based.ts`

---

🎉 **开始使用基于模型特性的任务分解系统！**
