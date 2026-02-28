# 当前 Agent 显示 - 更新说明

## 更新内容

修改了当前 Agent 的显示逻辑，现在会显示更具体的信息：

### 之前的显示

```
current agent: assistant
you >
```

用户不知道具体使用的是哪个 provider。

### 现在的显示

```
current agent: doubao
you >
```

或者对于自定义 Agent：

```
current agent: claude-opus-coder
you >
```

## 显示规则

### 1. 默认 Agent（名称为 "assistant"）

显示 **provider 名称**：

```
current agent: doubao
you >
```

```
current agent: claude
you >
```

```
current agent: openai
you >
```

### 2. 自定义 Agent

显示 **agent 名称**：

```
current agent: claude-opus-coder
you >
```

```
current agent: doubao-chinese-vision
you >
```

```
current agent: orchestrator
you >
```

## 使用场景

### 场景 1: 启动 CLI

```bash
npm run dev
```

如果默认 provider 是 doubao：
```
current agent: doubao
you >
```

### 场景 2: 切换 Provider

```bash
you > /provider claude
```

显示更新为：
```
current agent: claude
you >
```

### 场景 3: 使用自定义 Agent

```bash
you > /agent claude-opus-coder
```

显示更新为：
```
current agent: claude-opus-coder
you >
```

### 场景 4: Agent Handoff

当 orchestrator 委派任务给 claude-opus-coder：

```
current agent: orchestrator
  🔀 HANDOFF orchestrator → claude-opus-coder

current agent: claude-opus-coder
  💬 claude-opus-coder: 实现算法...
```

## 实现细节

### 显示逻辑

```typescript
// 对于默认 "assistant" agent，显示 provider 名称
const displayName = event.agent === "assistant"
  ? getDisplayName(event.provider)  // "doubao", "claude", "openai"
  : event.agent;                     // "claude-opus-coder", "orchestrator"

prompt.setCurrentAgent(displayName);
```

### Provider 名称映射

```typescript
const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  anthropic: "claude",
  openai: "openai",
  doubao: "doubao",
  qwen: "qwen",
  deepseek: "deepseek",
  ollama: "ollama",
};
```

## 优势

### 1. 更清晰的信息

**之前**：
```
current agent: assistant  // 不知道具体是哪个 provider
```

**现在**：
```
current agent: doubao  // 清楚地知道是 doubao
```

### 2. 自定义 Agent 识别

**自定义 Agent**：
```
current agent: claude-opus-coder  // 显示具体的 agent 名称
```

### 3. 一致性

- 默认 agent → 显示 provider 名称（用户关心的是用哪个模型）
- 自定义 agent → 显示 agent 名称（用户关心的是用哪个专家）

## 配置文件读取

系统会自动从配置文件读取 provider 信息，但**不会暴露 API key**：

```json
{
  "defaultProvider": "doubao",
  "doubao": {
    "apiKey": "***",  // 不会显示
    "model": "doubao-seed-1-8-251228"
  }
}
```

显示的信息：
- ✅ Provider 名称：`doubao`
- ✅ Model 名称：`doubao-seed-1-8-251228`
- ❌ API Key：**不显示**

## 测试

### 测试 1: 默认 Provider

```bash
npm run dev
```

预期显示：
```
current agent: doubao  # 或你配置的默认 provider
you >
```

### 测试 2: 切换 Provider

```bash
you > /provider claude
```

预期显示：
```
current agent: claude
you >
```

### 测试 3: 自定义 Agent

```bash
you > /agent claude-opus-coder
```

预期显示：
```
current agent: claude-opus-coder
you >
```

## 修改的代码

### 1. 初始化

```typescript
// 显示 provider 名称而不是 "assistant"
const initialDisplay = `${getDisplayName(activeAgent.provider)}`;
prompt.setCurrentAgent(initialDisplay);
```

### 2. 切换 Provider

```typescript
// 显示新的 provider 名称
prompt.setCurrentAgent(display);
```

### 3. 切换 Agent

```typescript
// 根据 agent 类型决定显示内容
const displayName = found.name === "assistant"
  ? getDisplayName(found.provider)
  : found.name;
prompt.setCurrentAgent(displayName);
```

### 4. Task Submitted 事件

```typescript
// 根据 agent 类型决定显示内容
const displayName = event.agent === "assistant"
  ? getDisplayName(event.provider)
  : event.agent;
prompt.setCurrentAgent(displayName);
```

## 总结

更新后的显示逻辑更加清晰和实用：

- ✅ 默认 agent 显示 provider 名称（doubao, claude, openai）
- ✅ 自定义 agent 显示 agent 名称（claude-opus-coder, orchestrator）
- ✅ 自动从配置文件读取信息
- ✅ 不暴露敏感信息（API key）
- ✅ 实时更新，准确反映当前状态

用户现在可以清楚地知道正在使用哪个具体的 provider 或 agent！

---

**更新日期**: 2026-02-28
**状态**: ✅ 完成并测试通过
