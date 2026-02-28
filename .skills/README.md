# Mechanical Revolution Skills

Skills 是 Mechanical Revolution 框架中可复用的任务处理模式。每个 skill 定义了一种特定的工作流程，包括所需的 agents、执行步骤和使用场景。

## 什么是 Skill？

Skill 是一个声明式的任务处理模板，它描述了：

- **任务类型**：这个 skill 适用于什么样的任务
- **所需 Agents**：需要哪些专家 agent 协作
- **工作流程**：任务如何分解和执行
- **配置示例**：如何在代码中使用这个 skill

## Skill 文件格式

每个 skill 使用 Markdown 文件定义，包含 YAML frontmatter 和详细说明：

```markdown
---
name: skill-name
description: Brief description of what this skill does
version: 1.0.0
author: Your Name
agents:
  - agent1
  - agent2
---

# Skill Name

## Description
[详细说明]

## When to Use
[使用场景]

## How It Works
[工作流程]

## Example
[示例]

## Configuration
[配置代码]
```

## 可用 Skills

### 核心 Skills

- **[task-decomposition](./task-decomposition.md)** - 任务分解与智能分配
  - 将复杂任务分解为子任务
  - 根据 agent 能力智能分配
  - 支持跨领域协作

### 应用场景 Skills

- **[research-and-code](./examples/research-and-code.md)** - 研究 + 编码
  - 先研究技术/概念
  - 再编写代码实现

- **[data-analysis](./examples/data-analysis.md)** - 数据分析
  - 数据处理 + 计算 + 可视化
  - 完整的数据分析流程

## 如何创建新的 Skill

1. **确定 Skill 的用途**
   - 这个 skill 解决什么问题？
   - 适用于哪些场景？

2. **设计工作流程**
   - 需要哪些 agents？
   - 任务如何分解？
   - 执行顺序是什么？

3. **创建 Markdown 文件**
   - 使用上述格式模板
   - 填写 frontmatter 元数据
   - 编写详细说明和示例

4. **测试和验证**
   - 创建示例代码
   - 测试不同场景
   - 优化工作流程

## 如何使用 Skill

### 方式 1：查看文档

```bash
# 启动 CLI
npm run dev

# 列出所有 skills
> /skills

# 查看特定 skill
> /skill task-decomposition
```

### 方式 2：在代码中实现

参考 skill 文档中的配置示例，在你的代码中创建相应的 agents 和 handoffs。

示例：

```typescript
import {
  defineAgent,
  handoff,
  createOrchestratorInstructions,
} from "mechanical-revolution";

// 定义专家 agents（带 capabilities）
const researchAgent = defineAgent({
  name: "researcher",
  // ... 配置
  capabilities: {
    summary: "Research specialist",
    skills: ["web_search", "fact_verification"],
  },
});

// 创建 orchestrator
const orchestrator = defineAgent({
  name: "orchestrator",
  instructions: (ctx) => createOrchestratorInstructions([researchAgent, ...]),
  handoffs: [handoff(researchAgent), ...],
});

// 运行
const runner = new Runner(config, [orchestrator, researchAgent, ...]);
await runner.run(orchestrator, "Your complex task here");
```

## 最佳实践

1. **明确 Agent 能力**
   - 为每个 agent 定义清晰的 capabilities
   - 包含 summary、skills、useCases、limitations

2. **合理分解任务**
   - 每个子任务应该是原子性的
   - 避免过度分解（增加开销）
   - 考虑任务依赖关系

3. **提供充足上下文**
   - Handoff 时传递必要的信息
   - 使用 contextFilter 和 inputFilter 控制信息流

4. **测试边界情况**
   - 简单任务（不需要分解）
   - 单领域任务（一个 agent）
   - 跨领域任务（多个 agents）

## 贡献

欢迎贡献新的 skills！请确保：

- 遵循文件格式规范
- 提供完整的示例代码
- 测试验证工作流程
- 更新本 README 的 skill 列表

## 参考

- [Task Decomposition 示例](../examples/task-decomposition-demo.ts)
- [Agent 配置文档](../README.md)
- [Handoff 机制说明](../src/handoff.ts)
