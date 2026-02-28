# Mechanical Revolution

<div align="center">

**🤖 智能多 Agent 协作框架**

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

*让 AI Agents 智能协作，自动完成复杂任务*

</div>

---

## 🎯 Overview

Mechanical Revolution 是一个强大的多 Agent 协作框架，核心特性：

- 🧠 **AI 驱动的任务路由** - 自动分析任务并选择最佳 agent（零维护成本）
- 🔄 **智能 Agent 切换** - 根据任务类型自动切换专家 agent
- 📊 **任务流追踪** - 完整记录任务执行过程
- 🎯 **Markdown Agent 定义** - 用户友好的 agent 配置
- 🌐 **多 Provider 支持** - Claude, OpenAI, Doubao, Qwen, DeepSeek, Ollama

## ✨ Key Features

### 🧠 AI 驱动的任务路由（NEW!）

系统会自动分析你的输入，智能选择最合适的 agent：

```
you > 帮我写一个快速排序算法

⏳ Analyzing task and selecting best agent...
🔀 Routing to claude-opus-coder (算法实现任务)

 STEP 1  claude-opus-coder (claude/claude-opus-4-6-kiro)
  💬 claude-opus-coder: 这是快速排序的实现...
```

**特点**：
- ✅ **零维护成本** - 无需手动配置路由规则
- ✅ **智能理解** - 理解完整语义和上下文
- ✅ **高准确性** - 95% 置信度，清晰的推理过程
- ✅ **自动适配** - 添加新 agent 无需修改代码

### 💾 持久化记忆系统（NEW!）

AI agents 能够记住之前的对话和重要信息：

```
you > /memory search TypeScript

[Memory] Found 2 relevant memories:
  - 用户喜欢使用 TypeScript 进行开发 (100.0%)
  - 用户正在开发一个多 Agent 协作框架 (85.3%)
```

**特点**：
- ✅ **两层记忆** - Quick Memory (热缓存) + Deep Memory (长期存储)
- ✅ **智能搜索** - 多维度相关性计算
- ✅ **LRU 淘汰** - 自动管理记忆容量
- ✅ **Markdown 存储** - 人类可读的格式
- ✅ **自动上下文注入** - 为 agent 提供相关记忆

### 🤖 智能 Agent 系统

**内置专家 Agents**：

| Agent | 专长 | 适用场景 |
|-------|------|---------|
| **claude-opus-coder** | 编码、算法实现 | 写代码、实现算法、代码重构 |
| **doubao-chinese-vision** | 中文内容、图像分析 | 中文文案、翻译、图像分析 |
| **orchestrator** | 任务分解、协调 | 复杂多步骤任务 |

系统会根据任务类型自动选择最合适的 agent：
- **编码任务** → claude-opus-coder
- **中文内容** → doubao-chinese-vision
- **复杂任务** → orchestrator

### 📊 任务流可视化

完整追踪任务执行过程：

```
📊 Task Flow Summary
  ├─ ✅ claude-opus-coder (claude/claude-opus-4-6-kiro) 2500ms
  │  🔧 Read
  │  🔧 Write
  │  ↓ handoff
  └─ ✅ orchestrator (claude/claude-opus-4-6-kiro) 1200ms

  Total: 3700ms | Tasks: 2
```

### 🎯 Markdown Agent 定义

用 Markdown 文件定义 agent，简单直观：

```yaml
---
name: my-agent
capabilities:
  summary: My agent description
  modelStrengths:
    - Strength 1
    - Strength 2
  bestFor:
    - Use case 1
    - Use case 2
---

You are a custom agent...
```

## 🚀 Quick Start

### 1. Installation

```bash
# 克隆仓库
git clone https://github.com/Heyu2002/Mechanical-Revolution.git
cd Mechanical-Revolution

# 安装依赖
npm install
```

### 2. Configuration

```bash
# 复制配置文件
cp config/config.example.json config/config.json
```

Edit `config/config.json` with your API keys:

```json
{
  "defaultProvider": "doubao",
  "providers": {
    "anthropic": {
      "apiKey": "sk-ant-...",
      "baseUrl": "https://api.anthropic.com",
      "model": "claude-opus-4-6-kiro",
      "apiType": "anthropic",
      "nativeToolCall": true
    },
    "doubao": {
      "apiKey": "...",
      "baseUrl": "https://ark.cn-beijing.volces.com/api/v3",
      "model": "doubao-seed-1-8-251228",
      "apiType": "openai",
      "nativeToolCall": false
    }
  }
}
```

### 3. Run

```bash
# 开发模式
npm run dev

# 构建
npm run build

# 运行构建后的版本
npm start
```

## 📖 Usage Examples

### Example 1: 编码任务

```
you > 帮我实现一个二分查找算法

⏳ Analyzing task and selecting best agent...
🔀 Routing to claude-opus-coder

 STEP 1  claude-opus-coder (claude/claude-opus-4-6-kiro)
  🔧 Write → binary-search.ts
  💬 claude-opus-coder: 我已经实现了二分查找算法...
```

### Example 2: 中文内容

```
you > 帮我润色这段文案：我们的产品很好用

⏳ Analyzing task and selecting best agent...
🔀 Routing to doubao-chinese-vision

 STEP 1  doubao-chinese-vision (doubao/doubao-seed-1-8)
  💬 doubao-chinese-vision: 润色后的文案：
  我们的产品以其卓越的用户体验和直观的操作界面...
```

### Example 3: 复杂任务

```
you > 研究 React 19 新特性，创建示例组件，并编写测试

⏳ Analyzing task and selecting best agent...
🔀 Routing to orchestrator

 STEP 1  orchestrator (claude/claude-opus-4-6-kiro)
  💬 orchestrator: 我将把这个任务分解为三个步骤...

  📤 The task was transferred to claude-opus-coder.

 STEP 2  claude-opus-coder (claude/claude-opus-4-6-kiro)
  🔧 WebSearch → React 19 features
  💬 claude-opus-coder: React 19 的主要新特性包括...
```

## 🎮 CLI Commands

| 命令 | 说明 |
|------|------|
| `/help` | 显示帮助信息 |
| `/provider` | 列出可用的 providers |
| `/provider <name>` | 切换 provider |
| `/agents` | 列出所有 agents |
| `/agent <name>` | 切换到指定 agent |
| `/verbose` | 切换详细模式 |
| `/memory` | 显示记忆统计 |
| `/memory search <query>` | 搜索记忆 |
| `/memory add <content>` | 手动添加记忆 |
| `/memory clear [quick\|deep\|both]` | 清空记忆 |
| `/memory stats` | 详细记忆统计 |
| `/skills` | 列出所有可用的 skills |
| `/skill <name>` | 显示指定 skill 的详细信息 |
| `/clear` | 清除对话历史 |
| `/quit` | 退出 |

## 🏗️ Architecture

### System Overview

```
User Input
    ↓
SimpleChatDetector (检测是否为简单对话)
    ↓
    ├─ Simple Chat → Use Current Agent
    └─ Complex Task
        ↓
    AITaskRouter (AI 分析任务)
        ↓
    Select Best Agent
        ↓
┌─────────┬─────────┬─────────┐
│Orchestrator│ Claude │ Doubao │
└─────────┴─────────┴─────────┘
    ↓
Execute Task (Runner)
    ↓
Task Flow Tracking
    ↓
Result
```

### Core Components

1. **SimpleChatDetector** - 快速检测简单对话（~1ms）
2. **AITaskRouter** - AI 驱动的任务路由（~500ms）
3. **Agent Registry** - 加载和管理 agents
4. **Runner** - 任务执行引擎
5. **TaskFlow** - 任务流追踪
6. **EventBus** - 事件驱动监控

### Directory Structure

```
.
├── src/
│   ├── chat-detector.ts        # 简单对话检测器
│   ├── ai-task-router.ts       # AI 任务路由器
│   ├── agent-registry.ts       # Agent 注册表
│   ├── agent-loader.ts         # Markdown 解析器
│   ├── runner.ts               # 执行引擎
│   ├── task-flow.ts            # 任务流追踪
│   ├── event-bus.ts            # 事件总线
│   └── cli.ts                  # 命令行界面
├── .agents/                    # Project agents
│   ├── claude-opus-coder.md
│   ├── doubao-chinese-vision.md
│   └── orchestrator.md
├── examples/
│   ├── test-ai-routing.ts
│   └── complete-multi-agent-demo.ts
└── docs/
    ├── AI_DRIVEN_ROUTING.md
    ├── PROJECT_COMPLETION_SUMMARY.md
    └── ARCHITECTURE_SUMMARY.md
```

## 📚 Documentation

### Quick Start
- [Quick Start Guide](QUICKSTART.md)
- [Quick Reference](QUICK_REFERENCE.md)

### Core Features
- [AI Driven Routing](AI_DRIVEN_ROUTING.md) - AI 驱动的任务路由
- [Router Provider Selection](ROUTER_PROVIDER_SELECTION.md) - 路由器 Provider 选择
- [Current Agent Display](CURRENT_AGENT_DISPLAY.md) - 当前 Agent 显示
- [Task Transfer Display](TASK_TRANSFER_DISPLAY.md) - 任务转移显示

### Architecture
- [Architecture Summary](ARCHITECTURE_SUMMARY.md) - 架构总结
- [Phase 1 Report](PHASE1_COMPLETION_REPORT.md) - Phase 1 完成报告
- [Phase 2 Report](PHASE2_COMPLETION_REPORT.md) - Phase 2 完成报告
- [Project Completion Summary](PROJECT_COMPLETION_SUMMARY.md) - 项目完成总结

## 🧪 Testing

```bash
# 测试 AI 路由
npx tsx examples/test-ai-routing.ts

# 测试完整流程
npx tsx examples/complete-multi-agent-demo.ts

# 测试任务复杂度
npx tsx examples/calculate-task-score.ts
```

## 📊 Performance

| Metric | Value |
|--------|-------|
| Chat Detection | ~1ms (本地) |
| AI Routing | ~500ms (LLM 调用) |
| Agent Switch | ~10ms (本地) |
| Memory Usage | ~50MB |
| Routing Cost | ~$0.005/次 |

## 🤝 Contributing

欢迎贡献！

### Adding New Agents

在 `.agents/` 目录创建 Markdown 文件：

```yaml
---
name: my-agent
description: My custom agent
provider: anthropic
model: claude-opus-4-6-kiro
capabilities:
  summary: My agent description
  modelStrengths:
    - Strength 1
    - Strength 2
  bestFor:
    - Use case 1
    - Use case 2
---

You are a custom agent...
```

### Adding New Tools

```typescript
import { defineTool } from "./tool.js";

export const myTool = defineTool({
  name: "my_tool",
  description: "My custom tool",
  parameters: {
    type: "object",
    properties: {
      input: { type: "string" }
    },
    required: ["input"]
  },
  execute: async (args) => {
    // Tool implementation
    return result;
  }
});
```

## 🗺️ Roadmap

- [ ] 路由缓存
- [ ] 批量路由
- [ ] 学习优化
- [ ] 本地模型路由
- [ ] 多模态支持
- [ ] Agent 插件系统

## 📝 License

MIT License

## 🙏 Acknowledgments

This project is inspired by:

- **Anthropic Claude** - AI capabilities
- **OpenAI GPT** - Language models
- **LangChain** - Agent frameworks

---

<div align="center">

**⭐ 如果这个项目对你有帮助，请给个 Star！**

Made with ❤️ by [Heyu2002](https://github.com/Heyu2002)

**Version**: 0.1.0 | **Status**: ✅ Production Ready | **Last Updated**: 2026-02-28

</div>
