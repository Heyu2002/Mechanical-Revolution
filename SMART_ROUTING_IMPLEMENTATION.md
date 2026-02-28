# 智能路由功能实现

## 问题描述

用户反馈：当输入算法实现任务（如"帮我生成一个有效回文子串算法"）时，系统直接使用默认的 assistant (doubao) 处理，而不是自动路由到更合适的 claude-opus-coder。

## 根本原因

CLI 中**没有集成智能路由功能**：
- 只是直接使用用户选择的 agent
- 没有分析任务类型
- 没有匹配最佳 agent
- 没有自动切换到合适的 agent

## 解决方案

在 CLI 中集成以下组件：

### 1. AgentRegistry - 加载项目 Agents

```typescript
const registry = new AgentRegistry({
  projectAgentsDir: path.join(process.cwd(), ".agents"),
  enableHotReload: false,
});

await registry.loadAll();
const projectAgents = registry.list();
```

### 2. TaskComplexityClassifier - 任务复杂度分析

```typescript
const complexityClassifier = createComplexityClassifier();
const complexityResult = complexityClassifier.classify(input);
```

### 3. AgentMatcher - 智能匹配最佳 Agent

```typescript
const agentMatcher = createAgentMatcher(projectAgents);
const matchResult = agentMatcher.findBestAgent(input, currentAgent, projectAgents);
```

### 4. 自动路由逻辑

```typescript
if (matchResult.shouldHandoff) {
  targetAgent = matchResult.bestAgent;
  activeAgent = targetAgent;

  console.log(
    `🔀 Routing to ${targetAgent.name} (${matchResult.reasoning})`
  );
}
```

## 实现细节

### 修改的文件

**src/cli.ts**:

1. **导入必要的模块**:
```typescript
import { AgentRegistry } from "./agent-registry.js";
import { createAgentMatcher } from "./agent-matcher.js";
import { createComplexityClassifier } from "./task-complexity.js";
import * as path from "path";
```

2. **启动时加载 agents**:
```typescript
console.log(`${C.dim}Loading project agents...${C.reset}`);
const registry = new AgentRegistry({
  projectAgentsDir: path.join(process.cwd(), ".agents"),
  enableHotReload: false,
});

await registry.loadAll();
const projectAgents = registry.list();
```

3. **初始化智能路由**:
```typescript
const complexityClassifier = createComplexityClassifier();
const agentMatcher = projectAgents.length > 0
  ? createAgentMatcher(projectAgents)
  : null;

if (agentMatcher) {
  console.log(`${C.green}✓${C.reset} ${C.dim}Smart routing enabled${C.reset}\n`);
}
```

4. **在用户输入时进行智能路由**:
```typescript
let targetAgent = activeAgent;

if (agentMatcher && projectAgents.length > 0) {
  const complexityResult = complexityClassifier.classify(trimmed);
  const matchResult = agentMatcher.findBestAgent(trimmed, activeAgent, projectAgents);

  if (flowRenderer.isVerbose()) {
    console.log(`[Routing] Complexity: ${complexityResult.complexity.toFixed(1)}/100`);
    console.log(`[Routing] Best match: ${matchResult.bestAgent.name}`);
    console.log(`[Routing] Should handoff: ${matchResult.shouldHandoff}`);
  }

  if (matchResult.shouldHandoff) {
    targetAgent = matchResult.bestAgent;
    activeAgent = targetAgent;

    const displayName = targetAgent.name === "assistant"
      ? getDisplayName(targetAgent.provider)
      : targetAgent.name;
    prompt.setCurrentAgent(displayName);

    console.log(
      `${C.yellow}🔀 Routing to ${C.cyan}${targetAgent.name}${C.reset} ${C.dim}(${matchResult.reasoning})${C.reset}\n`
    );
  }
}

for await (const event of runner.runStream(targetAgent, trimmed, ctx)) {
  renderEvent(event);
}
```

### 优化的文件

**.agents/claude-opus-coder.md**:

添加了更多算法相关的关键词到 `bestFor` 列表：

```yaml
bestFor:
  - 复杂功能实现
  - 大型代码重构
  - 算法优化
  - 算法实现      # 新增
  - 算法设计      # 新增
  - 数据结构设计
  - 编码
  - 写代码
  - 生成代码      # 新增
  - 实现
  - 开发
  - 写算法        # 新增
  - 实现算法      # 新增
  - 生成算法      # 新增
```

## 测试结果

### 测试用例 1: 回文子串算法

**输入**: "帮我生成一个有效回文子串算法"

**结果**:
```
✅ Routing to claude-opus-coder
   Similarity: 46.75%
   Reasoning: 任务与 claude-opus-coder 的匹配度更高 (46.7% vs 0.0%，差距 46.7%)
```

**Agent 匹配度**:
- claude-opus-coder: 46.75% ✅
- doubao-chinese-vision: 24.65%
- orchestrator: 4.33%

### 测试用例 2: 正态分布随机数算法

**输入**: "帮我写一个满足正态分布的随机数算法"

**结果**:
```
✅ Routing to claude-opus-coder
   Similarity: 19.36%
   Reasoning: 任务与 claude-opus-coder 的匹配度更高 (19.4% vs 7.2%，差距 12.2%)
```

## 启动流程

### 1. 加载 Agents

```
Loading project agents...
✓ Loaded 3 project agents
  claude-opus-coder - Claude Opus 4 - 编码能力突出，擅长复杂代码生成
  doubao-chinese-vision - Doubao - 中文理解能力强，擅长中文内容处理和图像分析
  orchestrator - Orchestrator - 任务分解和协调专家
```

### 2. 显示可用 Providers

```
Available providers:
  claude model=claude-opus-4-6-kiro toolCall=✅
  openai model=gpt-4o toolCall=✅
  doubao model=doubao-seed-1-8-251228 toolCall=❌
  ollama model=ahmadwaqar/mai-ui:latest toolCall=❌
```

### 3. 启用智能路由

```
✓ Smart routing enabled
```

### 4. 显示当前 Agent

```
Active: assistant (doubao/doubao-seed-1-8-251228)
Type / for commands.
```

## 用户体验

### 之前

```
current agent: doubao
you > 帮我生成一个有效回文子串算法

 STEP 1  doubao-chinese-vision (doubao/doubao-seed-1-8-251228)
  ⏳ doubao-chinese-vision is working...
  💬 doubao-chinese-vision: [使用 doubao 生成算法，效果不佳]
```

### 现在

```
current agent: doubao
you > 帮我生成一个有效回文子串算法

🔀 Routing to claude-opus-coder (任务与 claude-opus-coder 的匹配度更高)

 STEP 1  claude-opus-coder (claude/claude-opus-4-6-kiro)
  ⏳ claude-opus-coder is working...
  💬 claude-opus-coder: [使用 Claude Opus 4 生成高质量算法]
```

## 路由决策逻辑

### 1. 任务复杂度分析

```typescript
const complexityResult = complexityClassifier.classify(input);
// Score: 28.76/100
// Decision: simple_query
```

### 2. Agent 匹配

使用 TF-IDF + 余弦相似度计算每个 agent 与任务的匹配度：

```typescript
const matchResult = agentMatcher.findBestAgent(input, currentAgent, projectAgents);
```

### 3. Handoff 决策

需要同时满足：
- 最佳匹配的绝对相似度 >= 15%
- 相似度提升 >= 8%
- 不是同一个 Agent

```typescript
const shouldHandoff =
  best.similarity >= MIN_ABSOLUTE_SIMILARITY &&
  (best.similarity - currentSimilarity) >= MIN_IMPROVEMENT &&
  best.agent.name !== currentAgent.name;
```

## Verbose 模式

启用 verbose 模式可以看到详细的路由信息：

```bash
you > /verbose
Verbose mode: on

you > 帮我生成一个有效回文子串算法

[Routing] Complexity: 28.8/100 (simple_query)
[Routing] Best match: claude-opus-coder (46.7%)
[Routing] Should handoff: true

🔀 Routing to claude-opus-coder (任务与 claude-opus-coder 的匹配度更高)
```

## 优势

### 1. 自动化

- ✅ 无需手动切换 agent
- ✅ 系统自动识别任务类型
- ✅ 自动选择最合适的专家

### 2. 智能化

- ✅ 基于 TF-IDF 的语义匹配
- ✅ 考虑任务复杂度
- ✅ 多维度决策（绝对相似度 + 相对提升）

### 3. 透明化

- ✅ 显示路由决策过程
- ✅ 说明切换原因
- ✅ Verbose 模式提供详细信息

### 4. 可扩展

- ✅ 支持添加新的 agents
- ✅ 支持自定义能力描述
- ✅ 支持调整路由阈值

## 配置建议

### Agent 能力描述

为了获得最佳的路由效果，建议在 agent 定义中：

1. **详细的 bestFor 列表**：包含各种表达方式
   - "算法实现"、"实现算法"、"生成算法"
   - "写代码"、"编写代码"、"生成代码"

2. **清晰的 modelStrengths**：突出核心优势
   - "算法实现"、"复杂逻辑处理"、"架构设计"

3. **准确的 summary**：简洁描述 agent 的定位
   - "编码能力突出，擅长复杂代码生成"

### 路由阈值

当前阈值：
- `MIN_ABSOLUTE_SIMILARITY = 0.15` (15%)
- `MIN_IMPROVEMENT = 0.08` (8%)

可以根据实际使用情况调整：
- 提高阈值 → 更保守，减少切换
- 降低阈值 → 更激进，增加切换

## 未来优化

### 1. 上下文感知

考虑对话历史，避免频繁切换：

```typescript
if (recentHandoffs.length > 3) {
  MIN_IMPROVEMENT = 0.12; // 提高阈值
}
```

### 2. 用户偏好学习

记录用户的手动切换，优化路由决策：

```typescript
if (userPreferredAgent === "claude-opus-coder" && taskType === "algorithm") {
  MIN_IMPROVEMENT = 0.05; // 降低阈值
}
```

### 3. 多 Agent 协作

对于复杂任务，自动路由到 orchestrator：

```typescript
if (complexityResult.shouldDecompose) {
  targetAgent = orchestratorAgent;
}
```

## 总结

智能路由功能成功实现：

- ✅ 自动加载项目 agents
- ✅ 分析任务复杂度
- ✅ 智能匹配最佳 agent
- ✅ 自动切换到合适的专家
- ✅ 透明的决策过程
- ✅ 算法任务正确路由到 claude-opus-coder

用户现在可以直接输入任务，系统会自动选择最合适的 agent 来处理！

---

**实施日期**: 2026-02-28
**状态**: ✅ 完成并测试通过
