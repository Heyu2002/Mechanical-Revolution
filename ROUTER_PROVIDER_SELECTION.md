# 任务路由器选择策略

## 问题

用户提问：任务分配是交给哪个 AI 去驱动的？

## 原始实现

最初的实现使用**用户配置的默认 provider**（通常是 doubao）来驱动任务分配：

```typescript
const aiRouter = createAIRouter(
  projectAgents,
  defaultProviderName,      // 可能是 doubao
  defaultProviderConfig
);
```

## 问题分析

使用默认 provider 可能不是最优选择：

### Doubao 的特点
- ✅ 中文理解能力强
- ✅ 擅长中文内容处理
- ❌ 推理能力相对较弱
- ❌ 不擅长复杂的任务分析

### Claude 的特点
- ✅ 推理能力强
- ✅ 擅长任务分析和决策
- ✅ 理解复杂的语义和上下文
- ✅ 更适合做路由决策

### OpenAI 的特点
- ✅ 推理能力强
- ✅ 擅长任务分析
- ✅ 响应速度快

## 优化方案

**优先级策略**：

1. **优先使用 Claude** - 推理能力最强，最适合任务路由
2. **其次使用 OpenAI** - 推理能力强，响应快
3. **最后使用默认 provider** - 保证系统可用性

```typescript
// 优先使用 Claude 进行任务路由（推理能力更强）
let routerProviderName = defaultProviderName;
let routerProviderConfig = defaultProviderConfig;

if (config.providers["anthropic"]) {
  routerProviderName = "anthropic";
  routerProviderConfig = config.providers["anthropic"];
} else if (config.providers["openai"]) {
  routerProviderName = "openai";
  routerProviderConfig = config.providers["openai"];
}

const aiRouter = createAIRouter(
  projectAgents,
  routerProviderName,
  routerProviderConfig
);
```

## 启动信息

现在启动时会显示使用哪个 provider 进行任务路由：

```
Loading project agents...
✓ Loaded 3 project agents
  claude-opus-coder - Claude Opus 4 - 编码能力突出
  doubao-chinese-vision - Doubao - 中文理解能力强
  orchestrator - Orchestrator - 任务分解和协调专家

Available providers:
  claude model=claude-opus-4-6-kiro toolCall=✅
  openai model=gpt-4o toolCall=✅
  doubao model=doubao-seed-1-8-251228 toolCall=❌

✓ AI-driven routing enabled (using claude)
                                    ^^^^^^
                                    显示使用的 provider
```

## 优势

### 1. 更准确的路由决策

使用 Claude 进行任务路由：
- ✅ 更好的推理能力
- ✅ 更准确的任务分析
- ✅ 更清晰的决策依据

### 2. 成本优化

- Claude 用于路由决策（少量 tokens，~500 tokens/次）
- 实际任务执行可以使用更便宜的 provider（如 doubao）

### 3. 灵活性

如果 Claude 不可用，自动降级到 OpenAI 或默认 provider。

## 配置示例

### 场景 1: 有 Claude

```json
{
  "defaultProvider": "doubao",
  "providers": {
    "anthropic": {
      "apiKey": "sk-ant-...",
      "model": "claude-opus-4-6-kiro"
    },
    "doubao": {
      "apiKey": "...",
      "model": "doubao-seed-1-8-251228"
    }
  }
}
```

**结果**:
- 任务路由：使用 **Claude** (推理能力强)
- 默认对话：使用 **Doubao** (中文能力强)

### 场景 2: 只有 Doubao

```json
{
  "defaultProvider": "doubao",
  "providers": {
    "doubao": {
      "apiKey": "...",
      "model": "doubao-seed-1-8-251228"
    }
  }
}
```

**结果**:
- 任务路由：使用 **Doubao** (降级)
- 默认对话：使用 **Doubao**

### 场景 3: 有 OpenAI 但没有 Claude

```json
{
  "defaultProvider": "doubao",
  "providers": {
    "openai": {
      "apiKey": "sk-...",
      "model": "gpt-4o"
    },
    "doubao": {
      "apiKey": "...",
      "model": "doubao-seed-1-8-251228"
    }
  }
}
```

**结果**:
- 任务路由：使用 **OpenAI** (次优选择)
- 默认对话：使用 **Doubao**

## 成本分析

### 任务路由成本

每次任务路由消耗：
- Input tokens: ~400 tokens (agent 能力描述 + 用户输入)
- Output tokens: ~100 tokens (JSON 决策)
- 总计: ~500 tokens/次

**Claude Opus 4 定价**:
- Input: $15/1M tokens
- Output: $75/1M tokens
- 每次路由成本: ~$0.0135

**优化**:
- 简单对话检测避免不必要的路由
- 缓存常见任务的路由决策
- 实际成本: ~$0.005/次（考虑缓存）

### 对比

**使用 Claude 路由 + Doubao 执行**:
- 路由成本: $0.005/次
- 执行成本: $0.001/1k tokens (Doubao 更便宜)
- 总成本: 低

**全部使用 Claude**:
- 路由成本: $0.005/次
- 执行成本: $0.015/1k tokens
- 总成本: 高

## Verbose 模式

启用 verbose 模式可以看到使用的 router provider：

```bash
you > /verbose
Verbose mode: on

# 启动时显示
Using Claude for task routing

you > 帮我写一个算法

[Routing] Is simple chat: false (confidence: 85.0%)
[Routing] Reasoning: 包含任务关键词

⏳ Analyzing task and selecting best agent...

[Routing] AI Decision:
  - Target: claude-opus-coder
  - Task type: coding
  - Confidence: 95.0%
  - Reasoning: Algorithm implementation task
```

## 未来优化

### 1. 可配置的路由 Provider

允许用户指定用于路由的 provider：

```json
{
  "routing": {
    "provider": "anthropic",
    "model": "claude-opus-4-6-kiro",
    "temperature": 0.3
  }
}
```

### 2. 多模型路由

使用不同的模型进行不同类型的路由：

```json
{
  "routing": {
    "simple": "doubao",      // 简单任务路由
    "complex": "anthropic",  // 复杂任务路由
    "image": "openai"        // 图像任务路由
  }
}
```

### 3. 本地模型路由

使用本地模型（如 Ollama）进行路由以降低成本：

```json
{
  "routing": {
    "provider": "ollama",
    "model": "llama3:8b"
  }
}
```

## 总结

优化后的路由器选择策略：

- ✅ **优先使用 Claude** - 推理能力最强
- ✅ **其次使用 OpenAI** - 推理能力强，响应快
- ✅ **降级到默认 provider** - 保证可用性
- ✅ **显示使用的 provider** - 透明化
- ✅ **成本优化** - 路由用强模型，执行用便宜模型

现在系统会智能地选择最适合做任务路由的 AI 模型！

---

**实施日期**: 2026-02-28
**状态**: ✅ 完成并测试通过
