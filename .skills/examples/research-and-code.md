---
name: research-and-code
description: Research a technology or concept, then write code to implement it
version: 1.0.0
author: Mechanical-Revolution
agents:
  - orchestrator
  - researcher
  - coder
---

# Research and Code Skill

## Description

Research and Code 是一个常见的工作流程，适用于需要先了解某个技术或概念，然后编写代码实现的场景。

这个 skill 展示了如何使用 Task Decomposition 来处理跨领域任务：
1. **研究阶段**：researcher agent 搜索和分析信息
2. **编码阶段**：coder agent 基于研究结果编写代码
3. **结果整合**：orchestrator 将研究摘要和代码整合成完整响应

## When to Use

适用场景：

- 学习新技术并编写示例代码
- 研究 API 用法并实现集成
- 对比技术方案并选择实现
- 查找最佳实践并应用到代码中

示例任务：

- "研究 React 19 Server Components 并创建示例"
- "了解 WebSocket 的工作原理并用 Node.js 实现一个简单的聊天服务器"
- "研究 JWT 认证的最佳实践并实现一个认证中间件"
- "对比 REST 和 GraphQL，然后用 GraphQL 实现一个 API"

## How It Works

### 执行流程

```
用户：研究 X 技术并实现 Y 功能
    ↓
Orchestrator 分析
    ↓ 识别：需要研究 + 编码
    ↓ 分解：
    ↓   子任务1: 研究 X 技术
    ↓   子任务2: 实现 Y 功能
    ↓
Handoff to Researcher
    ↓
Researcher 执行 web_search
    ↓ 查找文档、教程、最佳实践
    ↓ 分析关键概念和用法
    ↓ 返回研究结果
    ↓
Handoff back to Orchestrator
    ↓
Orchestrator 接收研究结果
    ↓ 决策：需要编写代码
    ↓ 将研究结果作为上下文传递
    ↓
Handoff to Coder
    ↓
Coder 基于研究结果编写代码
    ↓ 应用最佳实践
    ↓ 添加注释和说明
    ↓ 返回代码
    ↓
Handoff back to Orchestrator
    ↓
Orchestrator 聚合结果
    ↓ 组织：研究摘要 + 代码实现
    ↓ 返回完整响应
```

### 关键优势

1. **知识驱动**：代码基于最新的研究结果，而非过时的训练数据
2. **上下文传递**：研究结果自动传递给 coder，无需用户手动复制
3. **完整响应**：用户同时获得理论知识和实践代码
4. **可追溯**：TaskFlow 记录完整的研究和编码过程

## Example

### 示例 1：React Server Components

**输入**：
```
研究 React 19 Server Components 的特性，并创建一个简单的示例组件
```

**Orchestrator 分析**：
```
任务分析：
- 需要研究 React 19 Server Components 的特性
- 需要编写示例代码

分解计划：
1. 研究任务 → researcher
2. 编码任务 → coder
```

**Researcher 输出**：
```markdown
# React 19 Server Components 研究

## 核心特性
- Server Components 在服务器端渲染，不发送 JS 到客户端
- 支持异步组件，可以直接 await 数据
- 改进的流式渲染和 Suspense 集成
- 自动代码分割和优化

## 关键用法
- 使用 'use server' 指令标记
- 可以直接访问数据库和文件系统
- 与 Client Components 混合使用
```

**Coder 输出**：
```typescript
// React 19 Server Component 示例
// 这是一个服务器组件，在服务器端渲染

import { db } from './db';

// 使用 async 函数，直接获取数据
async function UserProfile({ userId }: { userId: string }) {
  // 在服务器端直接查询数据库
  const user = await db.users.findById(userId);

  return (
    <div className="profile">
      <h1>{user.name}</h1>
      <p>{user.bio}</p>
      {/* 这部分 HTML 在服务器端生成，不需要客户端 JS */}
    </div>
  );
}

export default UserProfile;
```

**最终输出**：
```markdown
# React 19 Server Components 实现

## 技术概述
React 19 Server Components 允许组件在服务器端渲染，减少客户端 JS 体积...

## 示例代码
[上述代码]

## 使用说明
1. 确保使用 React 19+
2. 配置 Next.js 或其他支持 Server Components 的框架
3. 服务器组件可以直接访问后端资源
```

### 示例 2：WebSocket 聊天服务器

**输入**：
```
了解 WebSocket 的工作原理，然后用 Node.js 实现一个简单的聊天服务器
```

**执行流程**：
```
orchestrator → researcher (WebSocket 原理) → orchestrator → coder (Node.js 实现) → orchestrator
```

**最终输出**：
- WebSocket 协议说明
- 握手过程解释
- Node.js + ws 库实现的聊天服务器代码
- 客户端连接示例

## Configuration

### 基础配置

```typescript
import {
  defineAgent,
  defineTool,
  handoff,
  createOrchestratorInstructions,
  RESEARCHER_PROMPT,
  CODER_PROMPT,
} from "mechanical-revolution";
import { z } from "zod";

// 研究工具
const searchTool = defineTool({
  name: "web_search",
  description: "Search the web for information",
  parameters: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    // 实现搜索逻辑
    return { results: [...] };
  },
});

// Researcher Agent
const researchAgent = defineAgent({
  name: "researcher",
  instructions: RESEARCHER_PROMPT,
  provider: "openai",
  model: "gpt-4o",
  tools: [searchTool],
  capabilities: {
    summary: "Web research and information synthesis specialist",
    skills: ["web_search", "fact_verification", "information_synthesis"],
    useCases: ["Finding latest information", "Technology research"],
    limitations: ["Cannot write code"],
  },
});

// Coder Agent
const coderAgent = defineAgent({
  name: "coder",
  instructions: CODER_PROMPT,
  provider: "anthropic",
  model: "claude-opus-4",
  capabilities: {
    summary: "Software development specialist",
    skills: ["code_writing", "debugging", "best_practices"],
    useCases: ["Writing production code", "Creating examples"],
    limitations: ["Cannot perform web searches"],
  },
});

// Orchestrator
const orchestrator = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions([researchAgent, coderAgent]),
  provider: "openai",
  model: "gpt-4o",
  handoffs: [
    handoff(researchAgent, {
      description: "Delegate research tasks",
    }),
    handoff(coderAgent, {
      description: "Delegate coding tasks",
    }),
  ],
});
```

### 使用示例

```typescript
const runner = new Runner(config, [orchestrator, researchAgent, coderAgent]);

// 研究 + 编码任务
const result = await runner.run(
  orchestrator,
  "研究 GraphQL 的优势，然后实现一个简单的 GraphQL API"
);

console.log(result.output);
// 输出包含：
// 1. GraphQL 研究摘要
// 2. 完整的 API 实现代码
// 3. 使用说明
```

## Best Practices

### 1. 明确研究目标

在任务描述中明确需要研究的内容：

✅ 好的示例：
- "研究 React 19 Server Components 的特性并创建示例"
- "了解 JWT 认证的最佳实践并实现中间件"

❌ 不好的示例：
- "写一个 React 组件"（没有研究需求）
- "研究一下前端技术"（目标不明确）

### 2. 利用上下文传递

Orchestrator 会自动将研究结果传递给 coder，无需用户干预：

```typescript
// 可选：使用 contextFilter 控制传递的信息
handoff(coderAgent, {
  description: "Delegate coding tasks",
  contextFilter: (ctx) => ({
    ...ctx,
    // 只传递最近的研究结果
    history: ctx.history.slice(-5),
  }),
})
```

### 3. 优化 Prompt

可以在 agent 的 instructions 中强调协作：

```typescript
const coderAgent = defineAgent({
  name: "coder",
  instructions: `${CODER_PROMPT}

When receiving context from the researcher:
- Carefully read the research findings
- Apply the best practices mentioned
- Reference the key concepts in code comments
- Implement based on the latest information provided`,
  // ...
});
```

### 4. 处理复杂场景

对于更复杂的场景，可以添加更多步骤：

```
研究 → 对比分析 → 选型决策 → 编码实现 → 测试验证
```

这需要添加更多专家 agents（如 analyst, tester）。

## Troubleshooting

### 问题：Coder 没有使用研究结果

**原因**：上下文传递不完整或 coder 的 prompt 不够明确

**解决**：
1. 检查 handoff 的 contextFilter 配置
2. 在 coder 的 instructions 中强调使用上下文
3. 增加 Orchestrator 的 handoff reason 描述

### 问题：研究结果过于简略

**原因**：Researcher 的 prompt 或工具能力不足

**解决**：
1. 优化 RESEARCHER_PROMPT，要求更详细的输出
2. 改进 search tool 的实现
3. 在任务描述中明确研究深度

### 问题：代码质量不高

**原因**：Coder 没有充分理解研究结果

**解决**：
1. 确保研究结果包含关键的技术细节
2. 在 handoff 时提供更明确的编码要求
3. 使用更强大的 coder model（如 Claude Opus）

## Related

- [Task Decomposition Skill](../task-decomposition.md)
- [Data Analysis Skill](./data-analysis.md)
- [完整示例代码](../../examples/task-decomposition-demo.ts)
