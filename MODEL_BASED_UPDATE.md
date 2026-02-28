# 基于模型特性的任务分解系统 - 更新说明

## 🔄 重要更新

根据用户反馈，系统已从**基于角色的任务分配**重构为**基于模型特性的任务分配**。

## 核心变化

### 之前的设计 ❌
- 按**角色**定义 agents（researcher, coder, mathematician）
- Orchestrator 根据任务类型选择角色
- 忽略了不同 LLM 模型的具体优势

### 现在的设计 ✅
- 按**模型能力**定义 agents（claude-opus-coder, gpt4-analyst, doubao-chinese）
- Orchestrator 根据**模型的具体优势**选择最合适的 LLM
- 充分利用每个模型的特长

## 新的 AgentCapabilities 接口

```typescript
export interface AgentCapabilities {
  summary: string;              // 模型简短描述（如 "Claude Opus 4 - 编码能力突出"）
  modelStrengths: string[];     // 模型优势（如 ["长代码生成", "复杂逻辑", "架构设计"]）
  taskTypes: string[];          // 擅长的任务类型（如 ["code_writing", "debugging"]）
  languages?: string[];         // 擅长的编程语言或自然语言（可选）
  bestFor?: string[];           // 最适合的场景（可选）
  limitations?: string[];       // 限制说明（可选）
}
```

### 字段说明

- **summary**: 一句话描述模型的核心优势
- **modelStrengths**: 模型的具体优势（如"长代码生成"、"逻辑推理"）
- **taskTypes**: 擅长处理的任务类型
- **languages**: 擅长的编程语言或自然语言
- **bestFor**: 最适合的具体场景
- **limitations**: 模型的局限性

## 使用示例

### 定义基于模型的 Agents

```typescript
// Claude Opus 4 - 编码专家
const claudeOpusAgent = defineAgent({
  name: "claude-opus-coder",
  instructions: "You are Claude Opus 4, specialized in coding...",
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
    ],
    languages: [
      "TypeScript",
      "Python",
      "Rust",
      "Go",
    ],
    bestFor: [
      "复杂功能实现",
      "大型代码重构",
      "算法优化",
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
  instructions: "You are GPT-4o, specialized in analysis...",
  provider: "openai",
  model: "gpt-4o",
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
    ],
    bestFor: [
      "复杂问题分析",
      "数据统计计算",
      "信息检索和综合",
    ],
    limitations: [
      "代码生成能力不如 Claude Opus",
    ],
  },
});

// Doubao - 中文理解专家
const doubaoAgent = defineAgent({
  name: "doubao-chinese",
  instructions: "你是豆包，专注于中文内容处理...",
  provider: "doubao",
  model: "doubao-seed-2-0-pro-260215",
  capabilities: {
    summary: "Doubao - 中文理解能力强，擅长中文内容处理",
    modelStrengths: [
      "中文语境理解",
      "中文内容创作",
      "文化适配",
    ],
    taskTypes: [
      "chinese_writing",
      "translation",
      "content_creation",
    ],
    languages: [
      "Chinese (优势)",
      "English",
    ],
    bestFor: [
      "中文文案创作",
      "中文内容润色",
      "中英翻译",
    ],
    limitations: [
      "编码能力相对较弱",
    ],
  },
});
```

### Orchestrator 的能力注入

```typescript
const orchestrator = defineAgent({
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
```

### Orchestrator 看到的信息

```
**claude-opus-coder** (anthropic/claude-opus-4-20250514):
- Summary: Claude Opus 4 - 编码能力突出，擅长复杂代码生成
- Model Strengths: 长代码生成, 复杂逻辑处理, 架构设计, 多语言支持
- Task Types: code_writing, debugging, refactoring, architecture_design
- Languages: TypeScript, Python, Rust, Go
- Best For: 复杂功能实现; 大型代码重构; 算法优化
- Limitations: 不能执行 web 搜索; 不能进行复杂数学证明

**gpt4-analyst** (openai/gpt-4o):
- Summary: GPT-4o - 推理和分析能力强，擅长问题分解和数据分析
- Model Strengths: 逻辑推理, 问题分解, 数据分析, 信息综合
- Task Types: research, analysis, reasoning, calculation
- Languages: English, Chinese
- Best For: 复杂问题分析; 数据统计计算; 信息检索和综合
- Limitations: 代码生成能力不如 Claude Opus

**doubao-chinese** (doubao/doubao-seed-2-0-pro-260215):
- Summary: Doubao - 中文理解能力强，擅长中文内容处理
- Model Strengths: 中文语境理解, 中文内容创作, 文化适配
- Task Types: chinese_writing, translation, content_creation
- Languages: Chinese (优势), English
- Best For: 中文文案创作; 中文内容润色; 中英翻译
- Limitations: 编码能力相对较弱; 复杂逻辑推理不如 GPT-4o
```

## 任务分配示例

### 示例 1：编码任务
**用户输入**: "实现一个 TypeScript 的二叉搜索树"

**Orchestrator 分析**:
- 任务类型：code_writing
- 需要：长代码生成、复杂逻辑
- **选择**: claude-opus-coder（Claude Opus 4 擅长复杂代码生成）

### 示例 2：分析任务
**用户输入**: "分析为什么 React Server Components 能提升性能"

**Orchestrator 分析**:
- 任务类型：analysis, reasoning
- 需要：逻辑推理、问题分解
- **选择**: gpt4-analyst（GPT-4o 擅长推理和分析）

### 示例 3：中文内容任务
**用户输入**: "写一篇关于人工智能发展的中文短文"

**Orchestrator 分析**:
- 任务类型：chinese_writing
- 需要：中文语境理解、内容创作
- **选择**: doubao-chinese（Doubao 擅长中文内容处理）

### 示例 4：复合任务
**用户输入**: "研究快速排序算法的时间复杂度，然后用 Python 实现"

**Orchestrator 分析**:
- 子任务 1：研究和分析 → gpt4-analyst
- 子任务 2：代码实现 → claude-opus-coder

## 更新的文件

### 修改的文件
1. ✅ `src/types.ts` - 更新 `AgentCapabilities` 接口
2. ✅ `src/agent.ts` - 更新 `createOrchestratorInstructions()` 显示模型信息
3. ✅ `src/prompts/agents.ts` - 更新 `ORCHESTRATOR_PROMPT` 强调模型选择

### 新增的文件
1. ✅ `examples/model-based-decomposition.ts` - 基于模型的完整示例
2. ✅ `examples/test-model-based.ts` - 模型特性测试
3. ✅ `MODEL_BASED_UPDATE.md` - 本文档

## 测试验证

```bash
# 类型检查
npm run typecheck
# ✅ 通过

# 测试模型特性
npx tsx examples/test-model-based.ts
# ✅ 成功生成 4375 字符的 Orchestrator prompt
# ✅ 正确包含所有模型的 provider/model 信息
# ✅ 正确显示模型优势和任务类型

# 运行完整示例（需要 API keys）
npx tsx examples/model-based-decomposition.ts
```

## 核心优势

### 1. 充分利用模型特长
- Claude Opus 4 → 复杂编码任务
- GPT-4o → 推理和分析任务
- Doubao → 中文内容任务

### 2. 更精确的任务分配
- 不再是简单的角色匹配
- 根据模型的具体优势选择
- 考虑语言偏好和特殊能力

### 3. 灵活扩展
- 轻松添加新模型
- 每个模型可以有独特的能力描述
- 支持同一提供商的多个模型

### 4. 透明的决策过程
- Orchestrator 可以解释为什么选择某个模型
- 用户可以看到每个模型的具体优势
- TaskFlow 追踪显示模型选择链

## 最佳实践

### 1. 明确模型优势
```typescript
modelStrengths: [
  "长代码生成",      // 具体的优势
  "复杂逻辑处理",    // 而非泛泛的"编码能力"
]
```

### 2. 指定擅长的语言
```typescript
languages: [
  "TypeScript",
  "Python",
  "Rust",
]
```

### 3. 说明最佳场景
```typescript
bestFor: [
  "复杂功能实现",    // 具体场景
  "大型代码重构",    // 而非"所有编码任务"
]
```

### 4. 诚实说明限制
```typescript
limitations: [
  "不能执行 web 搜索",
  "代码生成能力不如 Claude Opus",
]
```

## 迁移指南

如果你之前使用了角色基础的设计，迁移步骤：

1. **重新定义 capabilities**
   ```typescript
   // 之前
   capabilities: {
     summary: "Research specialist",
     skills: ["web_search", "fact_verification"],
   }

   // 现在
   capabilities: {
     summary: "GPT-4o - 推理和分析能力强",
     modelStrengths: ["逻辑推理", "问题分解"],
     taskTypes: ["research", "analysis"],
   }
   ```

2. **更新 agent 名称**
   ```typescript
   // 之前：按角色命名
   name: "researcher"

   // 现在：按模型特性命名
   name: "gpt4-analyst"
   ```

3. **在 instructions 中强调模型身份**
   ```typescript
   instructions: "You are GPT-4o, specialized in analysis and reasoning..."
   ```

## 下一步

1. 配置 API keys
2. 运行 `npx tsx examples/model-based-decomposition.ts`
3. 观察 Orchestrator 如何根据模型特性分配任务
4. 根据实际效果调整模型的 capabilities 描述

---

🎉 **系统已更新为基于模型特性的任务分配！**
