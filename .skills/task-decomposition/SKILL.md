---
name: task-decomposition
description: Decompose complex tasks and delegate to specialist agents based on their capabilities
---

# Task Decomposition Skill

## Description

Task Decomposition 是 Mechanical Revolution 的核心 skill，它使 Orchestrator agent 能够：

1. **分析复杂任务**：理解用户请求的意图、复杂度和需求
2. **智能分解**：将复杂任务拆分为可管理的子任务
3. **能力匹配**：根据各个 agent 的 capabilities 选择最合适的专家
4. **协调执行**：通过 handoff 机制串行执行子任务
5. **结果聚合**：整合多个 agent 的输出，生成统一的响应

这个 skill 让框架能够处理跨领域的复杂任务，充分发挥多 agent 协作的优势。

## When to Use

适用于以下场景：

- **跨领域任务**：需要多个专业领域的知识（如"研究 + 编码"、"计算 + 可视化"）
- **多步骤流程**：任务需要按顺序完成多个步骤（如"研究 → 分析 → 实现"）
- **复杂问题**：单个 agent 难以独立完成的任务
- **需要专家协作**：充分利用各个专家 agent 的特长

不适用于：

- 简单的单领域任务（直接使用专家 agent 更高效）
- 实时性要求极高的场景（多次 handoff 会增加延迟）

## How It Works

### 工作流程

```
用户输入
    ↓
Orchestrator 分析任务
    ↓
简单任务? ──Yes──> 直接响应
    ↓ No
任务分解（生成子任务列表）
    ↓
确定执行策略（串行）
    ↓
分配给 Agent 1（通过 handoff）
    ↓
Agent 1 执行并返回结果
    ↓
Orchestrator 接收结果
    ↓
更多子任务? ──Yes──> 分配给 Agent 2
    ↓ No
结果聚合
    ↓
返回最终输出
```

### 关键机制

1. **Capabilities 系统**
   - 每个 agent 定义 `capabilities` 字段
   - 包含 summary、skills、useCases、limitations
   - Orchestrator 根据这些信息做出分配决策

2. **动态 Prompt 注入**
   - 使用 `createOrchestratorInstructions(agents)` 函数
   - 自动将所有 agent 的能力描述注入到 Orchestrator 的 prompt 中
   - LLM 根据能力描述自主决策任务分配

3. **Handoff-based 委派**
   - 利用现有的 handoff 机制
   - 每次 handoff 创建一个新的子任务
   - TaskFlow 自动追踪完整的任务链

## Example

### 示例 1：研究 + 编码

**用户输入**：
```
研究 React 19 Server Components 并创建一个简单的示例组件
```

**执行流程**：
```
orchestrator (分析任务)
    ↓ 识别：需要研究 + 编码
    ↓ 分解：
    ↓   - 子任务1: 研究 React 19 Server Components
    ↓   - 子任务2: 编写示例组件代码
    ↓
researcher (执行 web_search)
    ↓ 返回：Server Components 的特性和用法
    ↓
orchestrator (接收研究结果)
    ↓ 决策：需要编写代码
    ↓
coder (基于研究结果编写代码)
    ↓ 返回：React Server Component 示例
    ↓
orchestrator (聚合结果)
    ↓ 输出：研究摘要 + 示例代码
```

**TaskFlow**：
```
Task 1: orchestrator (submitted → working → handoff)
Task 2: researcher (submitted → working → completed)
Task 3: orchestrator (submitted → working → handoff)
Task 4: coder (submitted → working → completed)
Task 5: orchestrator (submitted → working → completed)
```

### 示例 2：计算 + 编码

**用户输入**：
```
计算 10000 元在 5% 年利率下 10 年的复利，然后用 Python 写一个函数实现它
```

**执行流程**：
```
orchestrator → mathematician (计算复利) → orchestrator → coder (编写 Python 函数) → orchestrator
```

### 示例 3：简单问候

**用户输入**：
```
你好！
```

**执行流程**：
```
orchestrator (直接响应，不委派)
```

## Configuration

### 完整配置示例

```typescript
import {
  defineAgent,
  defineTool,
  handoff,
  Runner,
  loadConfig,
  registerBuiltinProviders,
  createOrchestratorInstructions,
  RESEARCHER_PROMPT,
  CODER_PROMPT,
  MATHEMATICIAN_PROMPT,
} from "mechanical-revolution";
import { z } from "zod";

const config = loadConfig();
registerBuiltinProviders();

// ── 定义工具 ──

const searchTool = defineTool({
  name: "web_search",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string().describe("The search query"),
  }),
  execute: async ({ query }) => {
    // 实现搜索逻辑
    return { results: [...] };
  },
});

const calculatorTool = defineTool({
  name: "calculator",
  description: "Perform math calculations",
  parameters: z.object({
    expression: z.string().describe("Math expression"),
  }),
  execute: async ({ expression }) => {
    // 实现计算逻辑
    return { result: eval(expression) };
  },
});

// ── 定义专家 Agents（带 capabilities）──

const researchAgent = defineAgent({
  name: "researcher",
  instructions: RESEARCHER_PROMPT,
  provider: "openai",
  model: "gpt-4o",
  tools: [searchTool],
  capabilities: {
    summary: "Web research and information synthesis specialist",
    skills: [
      "web_search",
      "fact_verification",
      "information_synthesis",
      "comparative_analysis",
    ],
    useCases: [
      "Answering factual questions",
      "Finding latest information",
      "Comparing technologies",
    ],
    limitations: [
      "Cannot perform calculations",
      "Cannot write code",
    ],
  },
});

const coderAgent = defineAgent({
  name: "coder",
  instructions: CODER_PROMPT,
  provider: "anthropic",
  model: "claude-opus-4",
  capabilities: {
    summary: "Software development and code writing specialist",
    skills: [
      "code_writing",
      "debugging",
      "refactoring",
      "code_review",
      "testing",
    ],
    useCases: [
      "Writing production code",
      "Fixing bugs",
      "Code optimization",
    ],
    limitations: [
      "Cannot perform web searches",
      "Cannot do complex math",
    ],
  },
});

const mathAgent = defineAgent({
  name: "mathematician",
  instructions: MATHEMATICIAN_PROMPT,
  provider: "openai",
  model: "gpt-4o",
  tools: [calculatorTool],
  capabilities: {
    summary: "Mathematical computation and analysis specialist",
    skills: [
      "calculations",
      "statistical_analysis",
      "financial_calculations",
    ],
    useCases: [
      "Solving equations",
      "Data analysis",
      "Financial calculations",
    ],
    limitations: [
      "Cannot search the web",
      "Cannot write production code",
    ],
  },
});

// ── 定义 Orchestrator Agent ──

const allAgents = [researchAgent, coderAgent, mathAgent];

const orchestratorAgent = defineAgent({
  name: "orchestrator",
  // 动态注入 agent capabilities
  instructions: (ctx) => createOrchestratorInstructions(allAgents),
  provider: "openai",
  model: "gpt-4o",
  handoffs: [
    handoff(researchAgent, {
      description: "Delegate research tasks to the research specialist",
    }),
    handoff(coderAgent, {
      description: "Delegate coding tasks to the code specialist",
    }),
    handoff(mathAgent, {
      description: "Delegate mathematical tasks to the math specialist",
    }),
  ],
});

// ── 运行 ──

const runner = new Runner(config, [orchestratorAgent, ...allAgents]);

const result = await runner.run(
  orchestratorAgent,
  "研究 React 19 并创建示例组件"
);

console.log(result.output);
console.log(`Task flow: ${result.flow.tasks.map(t => t.targetAgent).join(' → ')}`);
```

## Key Points

### 1. Agent Capabilities 定义

每个专家 agent 必须定义 `capabilities` 字段：

```typescript
capabilities: {
  summary: "简短描述（一句话）",
  skills: ["skill1", "skill2", ...],
  useCases: ["场景1", "场景2", ...],      // 可选
  limitations: ["限制1", "限制2", ...],   // 可选
}
```

### 2. Orchestrator Instructions

使用 `createOrchestratorInstructions()` 动态生成：

```typescript
instructions: (ctx) => createOrchestratorInstructions(allAgents)
```

这会自动将所有 agent 的能力描述注入到 Orchestrator 的 system prompt 中。

### 3. Handoffs 配置

为每个专家 agent 配置 handoff：

```typescript
handoffs: [
  handoff(agentA, { description: "When to use agent A" }),
  handoff(agentB, { description: "When to use agent B" }),
]
```

### 4. TaskFlow 追踪

框架自动追踪完整的任务流：

```typescript
result.flow.tasks  // 所有任务节点
result.flow.tasks.map(t => t.targetAgent)  // 任务链
```

## Performance Considerations

### 延迟

- 每次 handoff 都是一次 LLM 调用
- 复杂任务可能需要多次往返
- 适合对延迟不敏感的场景

### Token 使用

- Orchestrator 的 prompt 包含所有 agent 的能力描述
- 每次调用都会消耗这些 tokens
- 建议控制 agent 数量（5-10 个为宜）

### 优化建议

1. **合理分组**：将相似的 agents 分组，减少 Orchestrator 的选择复杂度
2. **精简描述**：capabilities 描述要简洁明了
3. **缓存结果**：对于重复的子任务，可以缓存结果
4. **并行执行**（未来）：独立的子任务可以并行执行

## Troubleshooting

### 问题 1：Orchestrator 选择了错误的 agent

**原因**：capabilities 描述不够清晰或有歧义

**解决**：
- 明确每个 agent 的 skills 和 limitations
- 在 useCases 中提供具体的场景示例
- 优化 Orchestrator prompt

### 问题 2：任务分解过度

**原因**：Orchestrator 将简单任务也进行了分解

**解决**：
- 在 Orchestrator prompt 中强调"避免过度分解"
- 调整 temperature 参数（降低随机性）
- 提供更多"直接响应"的示例

### 问题 3：TaskFlow 追踪不完整

**原因**：handoff 配置错误或 agent 未注册

**解决**：
- 确保所有 agent 都注册到 Runner
- 检查 handoffs 配置是否正确
- 查看 Runner 的事件输出

## Related

- [完整示例代码](../examples/task-decomposition-demo.ts)
- [Research + Code Skill](./examples/research-and-code.md)
- [Data Analysis Skill](./examples/data-analysis.md)
- [Agent 配置文档](../README.md)
