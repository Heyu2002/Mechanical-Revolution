# Mechanical Revolution - 项目重构计划

基于 Gemini CLI 和 Codex 的深度学习成果

---

## 📋 重构目标

1. **避免重复造轮子** - 借鉴 Gemini CLI 和 Codex 的成熟架构模式
2. **模块化组织** - 按功能领域组织代码，提高可维护性
3. **清晰的职责分离** - CLI、核心逻辑、路由、记忆等各司其职
4. **可扩展性** - 为未来功能（MCP、A2A、插件系统）预留空间
5. **开发体验** - 更好的代码组织和导航

---

## 🎯 核心学习成果

### 从 Gemini CLI 学到的

1. **Monorepo 架构** - 使用 npm workspaces 组织多个包
2. **Ink (React for CLI)** - 声明式 UI 构建，更好的交互体验
3. **MCP (Model Context Protocol)** - 标准化的工具/资源协议
4. **OpenTelemetry** - 完整的可观测性（traces, metrics, logs）
5. **Skills 系统** - 可扩展的技能插件机制
6. **清晰的包划分**:
   - `@gemini-cli/core` - 核心逻辑
   - `@gemini-cli/cli` - CLI 界面
   - `@gemini-cli/mcp` - MCP 协议支持
   - `@gemini-cli/skills` - 技能系统

### 从 Codex 学到的

1. **高性能架构** - Rust 核心 + TypeScript 前端
2. **原生沙箱** - 安全的代码执行环境
3. **Ratatui TUI** - 高性能终端界面
4. **Tree-sitter** - 精确的代码解析
5. **清晰的 Crate 划分**:
   - `codex-core` - 核心引擎
   - `codex-cli` - CLI 入口
   - `codex-sandbox` - 沙箱执行
   - `codex-parser` - 代码解析

---

## 🏗️ 新的目录结构

```
mechanical-revolution/
├── packages/                          # Monorepo 包（未来扩展）
│   ├── core/                         # 核心框架
│   ├── cli/                          # CLI 应用
│   └── mcp/                          # MCP 支持（未来）
│
├── src/
│   ├── cli/                          # CLI 相关（从 Gemini CLI 学习）
│   │   ├── index.ts                 # CLI 入口
│   │   ├── commands/                # 命令处理
│   │   │   ├── agent.ts            # /agent, /agents
│   │   │   ├── provider.ts         # /provider
│   │   │   ├── skill.ts            # /skill, /skills
│   │   │   ├── memory.ts           # /memory（未来）
│   │   │   └── index.ts
│   │   ├── ui/                      # UI 组件（未来可用 Ink）
│   │   │   ├── chat.ts             # 聊天界面
│   │   │   ├── task-flow.ts        # 任务流显示
│   │   │   └── spinner.ts          # 加载动画
│   │   ├── autocomplete.ts          # 自动补全
│   │   └── repl.ts                  # REPL 循环
│   │
│   ├── core/                         # 核心框架
│   │   ├── agent/                   # Agent 系统
│   │   │   ├── agent.ts            # Agent 定义
│   │   │   ├── registry.ts         # Agent 注册表
│   │   │   ├── loader.ts           # Markdown 加载器
│   │   │   └── index.ts
│   │   ├── runner/                  # 执行引擎
│   │   │   ├── runner.ts           # 主执行器
│   │   │   ├── context.ts          # 执行上下文
│   │   │   └── index.ts
│   │   ├── tool/                    # 工具系统
│   │   │   ├── tool.ts             # 工具定义
│   │   │   ├── handoff.ts          # Handoff 工具
│   │   │   └── index.ts
│   │   ├── guardrail/               # 护栏系统
│   │   │   ├── guardrail.ts
│   │   │   └── index.ts
│   │   └── index.ts
│   │
│   ├── routing/                      # 路由系统（核心创新）
│   │   ├── chat-detector.ts         # 简单对话检测
│   │   ├── ai-router.ts             # AI 任务路由
│   │   └── index.ts
│   │
│   ├── memory/                       # 记忆系统
│   │   ├── task-memory.ts           # 任务记忆
│   │   ├── quick-memory.ts          # 快速记忆
│   │   ├── deep-memory.ts           # 深度记忆
│   │   └── index.ts
│   │
│   ├── providers/                    # Provider 抽象
│   │   ├── base.ts
│   │   ├── anthropic.ts
│   │   ├── openai.ts
│   │   ├── registry.ts
│   │   ├── tool-prompt.ts
│   │   └── index.ts
│   │
│   ├── skills/                       # Skills 系统（从 Gemini CLI 学习）
│   │   ├── loader.ts                # Skill 加载器
│   │   ├── registry.ts              # Skill 注册表
│   │   └── index.ts
│   │
│   ├── observability/                # 可观测性（从 Gemini CLI 学习）
│   │   ├── tracing.ts               # 追踪系统
│   │   ├── task-flow.ts             # 任务流追踪
│   │   ├── event-bus.ts             # 事件总线
│   │   └── index.ts
│   │
│   ├── config/                       # 配置管理
│   │   ├── config.ts                # 配置加载
│   │   └── index.ts
│   │
│   ├── prompts/                      # Prompt 管理
│   │   ├── system.ts
│   │   ├── agents.ts
│   │   └── index.ts
│   │
│   ├── utils/                        # 工具函数
│   │   ├── logger.ts
│   │   ├── stream.ts
│   │   └── index.ts
│   │
│   ├── types/                        # 类型定义
│   │   ├── agent.ts
│   │   ├── provider.ts
│   │   ├── tool.ts
│   │   ├── memory.ts
│   │   └── index.ts
│   │
│   └── index.ts                      # 主导出
│
├── .agents/                          # Agent 定义
├── .skills/                          # Skill 定义
├── config/                           # 配置文件
├── examples/                         # 示例代码
├── docs/                             # 文档
├── tests/                            # 测试（未来）
│
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── README.md
```

---

## 📦 模块职责划分

### 1. CLI 模块 (`src/cli/`)

**职责**: 用户交互、命令处理、UI 渲染

**文件迁移**:
- `src/cli.ts` → `src/cli/index.ts` + `src/cli/repl.ts`
- `src/autocomplete.ts` → `src/cli/autocomplete.ts`
- 命令处理逻辑 → `src/cli/commands/`

**未来增强**:
- 使用 Ink 重写 UI（React 组件式）
- 更丰富的交互体验（进度条、表格、颜色）
- 命令插件系统

### 2. Core 模块 (`src/core/`)

**职责**: 核心框架逻辑，与 CLI 无关

**文件迁移**:
- `src/agent.ts` → `src/core/agent/agent.ts`
- `src/agent-registry.ts` → `src/core/agent/registry.ts`
- `src/agent-loader.ts` → `src/core/agent/loader.ts`
- `src/runner.ts` → `src/core/runner/runner.ts`
- `src/context.ts` → `src/core/runner/context.ts`
- `src/tool.ts` → `src/core/tool/tool.ts`
- `src/handoff.ts` → `src/core/tool/handoff.ts`
- `src/guardrail.ts` → `src/core/guardrail/guardrail.ts`

**设计原则**:
- 完全独立于 CLI
- 可以被其他应用（Web、API）使用
- 清晰的 API 边界

### 3. Routing 模块 (`src/routing/`)

**职责**: 智能任务路由（项目核心创新）

**文件迁移**:
- `src/chat-detector.ts` → `src/routing/chat-detector.ts`
- `src/ai-task-router.ts` → `src/routing/ai-router.ts`

**保持独立性**: 这是项目的核心竞争力

### 4. Memory 模块 (`src/memory/`)

**职责**: 任务记忆管理

**文件迁移**:
- `src/task-memory-system.ts` → 拆分为:
  - `src/memory/task-memory.ts` (主类)
  - `src/memory/quick-memory.ts` (快速记忆)
  - `src/memory/deep-memory.ts` (深度记忆)

**未来增强**:
- 向量化搜索（学习 Codex 的 embedding）
- 更智能的热度算法
- 记忆压缩和归档

### 5. Providers 模块 (`src/providers/`)

**职责**: LLM Provider 抽象

**保持现状**: 已经组织良好

**未来增强**:
- 更多 provider（Gemini、Qwen、DeepSeek）
- Provider 插件系统
- 统一的错误处理

### 6. Skills 模块 (`src/skills/`)

**职责**: 可扩展的技能系统（学习 Gemini CLI）

**文件迁移**:
- `src/skill-loader.ts` → `src/skills/loader.ts`
- 新增 `src/skills/registry.ts`

**未来增强**:
- Skill 依赖管理
- Skill 版本控制
- Skill 市场（社区贡献）

### 7. Observability 模块 (`src/observability/`)

**职责**: 可观测性（学习 Gemini CLI 的 OpenTelemetry）

**文件迁移**:
- `src/tracing.ts` → `src/observability/tracing.ts`
- `src/task-flow.ts` → `src/observability/task-flow.ts`
- `src/event-bus.ts` → `src/observability/event-bus.ts`

**未来增强**:
- OpenTelemetry 集成
- Metrics 收集
- 性能分析

### 8. Config 模块 (`src/config/`)

**职责**: 配置管理

**文件迁移**:
- `src/config.ts` → `src/config/config.ts`

### 9. Types 模块 (`src/types/`)

**职责**: 类型定义

**文件迁移**:
- `src/types.ts` → 拆分为:
  - `src/types/agent.ts`
  - `src/types/provider.ts`
  - `src/types/tool.ts`
  - `src/types/memory.ts`
  - `src/types/index.ts` (统一导出)

---

## 🔄 迁移步骤

### Phase 1: 创建新目录结构（不破坏现有代码）

1. 创建所有新目录
2. 保持 `src/` 下的旧文件不动
3. 验证构建仍然正常

### Phase 2: 迁移 CLI 模块

1. 创建 `src/cli/` 目录
2. 迁移 `cli.ts` 和 `autocomplete.ts`
3. 提取命令处理逻辑到 `commands/`
4. 更新导入路径
5. 测试 CLI 功能

### Phase 3: 迁移 Core 模块

1. 创建 `src/core/` 子目录
2. 迁移 agent、runner、tool、guardrail
3. 更新内部导入
4. 更新 `src/index.ts` 导出
5. 测试核心功能

### Phase 4: 迁移其他模块

1. Routing → `src/routing/`
2. Memory → `src/memory/`
3. Skills → `src/skills/`
4. Observability → `src/observability/`
5. Config → `src/config/`
6. Types → `src/types/`

### Phase 5: 清理和验证

1. 删除旧文件
2. 更新所有导入路径
3. 运行完整测试
4. 更新文档
5. 提交代码

---

## 🎨 代码组织原则

### 1. 单一职责

每个模块只负责一个领域：
- CLI 只管用户交互
- Core 只管核心逻辑
- Routing 只管任务路由

### 2. 依赖方向

```
CLI → Core → Providers
  ↓     ↓
Routing Memory
  ↓     ↓
Observability
```

- CLI 可以依赖所有模块
- Core 不依赖 CLI
- 底层模块不依赖上层模块

### 3. 导出策略

每个模块有自己的 `index.ts`:
```typescript
// src/core/agent/index.ts
export { defineAgent, resolveInstructions } from "./agent.js";
export { AgentRegistry } from "./registry.js";
export { parseAgentMarkdown } from "./loader.js";
export type { AgentConfig, AgentCapabilities } from "../../types/agent.js";
```

主 `src/index.ts` 重新导出所有公共 API:
```typescript
// src/index.ts
export * from "./core/index.js";
export * from "./routing/index.js";
export * from "./memory/index.js";
// ... 但不导出 CLI 内部实现
```

### 4. 类型组织

所有类型定义集中在 `src/types/`:
```typescript
// src/types/agent.ts
export interface AgentConfig { ... }
export interface AgentCapabilities { ... }

// src/types/index.ts
export * from "./agent.js";
export * from "./provider.js";
export * from "./tool.js";
```

---

## 🚀 未来增强（基于学习成果）

### 短期（1-2 个月）

1. **完成目录重构** - 按新结构组织代码
2. **CLI 命令插件化** - 学习 Gemini CLI 的命令系统
3. **Skills 注册表** - 完善 skill 管理
4. **更好的错误处理** - 统一错误类型和处理

### 中期（3-6 个月）

1. **Ink UI 重写** - 使用 React 组件构建 CLI
2. **MCP 协议支持** - 标准化工具/资源接口
3. **OpenTelemetry 集成** - 完整的可观测性
4. **向量化记忆搜索** - 更智能的记忆检索

### 长期（6-12 个月）

1. **Monorepo 架构** - 拆分为多个 npm 包
2. **插件市场** - 社区贡献的 agents/skills/tools
3. **Web UI** - 基于 core 构建 Web 界面
4. **A2A 协议** - Agent-to-Agent 通信
5. **Rust 核心** - 性能关键部分用 Rust 重写（学习 Codex）

---

## 📊 重构收益

### 代码质量

- ✅ 更清晰的模块边界
- ✅ 更容易定位代码
- ✅ 更好的可测试性
- ✅ 更低的耦合度

### 开发体验

- ✅ 更快的代码导航
- ✅ 更容易添加新功能
- ✅ 更好的 IDE 支持
- ✅ 更清晰的依赖关系

### 可扩展性

- ✅ 为 MCP 预留空间
- ✅ 为 Monorepo 预留空间
- ✅ 为插件系统预留空间
- ✅ 为 Web UI 预留空间

### 性能

- ✅ 更小的构建产物（按需导入）
- ✅ 更快的编译速度（模块化）
- ✅ 更好的 Tree-shaking

---

## 🎯 关键决策

### 1. 为什么不立即使用 Monorepo？

**原因**:
- 当前项目规模还不需要
- 先完成模块化重构
- 未来可以平滑迁移

**何时迁移**:
- 需要独立发布某些包时
- 需要不同的发布周期时
- 团队规模扩大时

### 2. 为什么不立即使用 Ink？

**原因**:
- 当前 CLI 功能已经满足需求
- Ink 有学习成本
- 先完成目录重构

**何时迁移**:
- 需要更复杂的 UI 时
- 需要更好的交互体验时
- 有时间投入重写时

### 3. 为什么不立即集成 MCP？

**原因**:
- 当前工具系统已经工作良好
- MCP 还在快速演进
- 先完成核心功能

**何时集成**:
- MCP 协议稳定后
- 需要与其他 MCP 工具互操作时
- 社区有足够的 MCP 资源时

### 4. 为什么保留 TypeScript 而不用 Rust？

**原因**:
- TypeScript 生态成熟
- 开发速度快
- 团队熟悉度高
- 性能已经足够

**何时考虑 Rust**:
- 性能成为瓶颈时
- 需要原生沙箱时
- 需要更好的安全性时

---

## 📝 实施检查清单

### Phase 1: 准备工作
- [ ] 创建新分支 `refactor/directory-structure`
- [ ] 备份当前代码
- [ ] 创建所有新目录
- [ ] 验证构建正常

### Phase 2: CLI 迁移
- [ ] 创建 `src/cli/` 目录结构
- [ ] 迁移 `cli.ts` → `cli/index.ts` + `cli/repl.ts`
- [ ] 迁移 `autocomplete.ts` → `cli/autocomplete.ts`
- [ ] 提取命令到 `cli/commands/`
- [ ] 更新导入路径
- [ ] 测试 CLI 功能
- [ ] 提交 Phase 2

### Phase 3: Core 迁移
- [ ] 创建 `src/core/` 子目录
- [ ] 迁移 agent 相关文件
- [ ] 迁移 runner 相关文件
- [ ] 迁移 tool 相关文件
- [ ] 迁移 guardrail 相关文件
- [ ] 更新内部导入
- [ ] 更新 `src/index.ts`
- [ ] 测试核心功能
- [ ] 提交 Phase 3

### Phase 4: 其他模块迁移
- [ ] 迁移 Routing 模块
- [ ] 迁移 Memory 模块
- [ ] 迁移 Skills 模块
- [ ] 迁移 Observability 模块
- [ ] 迁移 Config 模块
- [ ] 迁移 Types 模块
- [ ] 提交 Phase 4

### Phase 5: 清理
- [ ] 删除旧文件
- [ ] 更新所有示例
- [ ] 更新文档
- [ ] 运行完整测试
- [ ] 更新 README
- [ ] 提交 Phase 5

### Phase 6: 验证
- [ ] 构建成功
- [ ] 所有示例运行正常
- [ ] CLI 功能正常
- [ ] 性能无退化
- [ ] 合并到主分支

---

## 🎓 总结

这个重构计划基于对 Gemini CLI 和 Codex 的深度学习，旨在：

1. **借鉴成熟架构** - 学习业界最佳实践
2. **保持项目特色** - 保留 AI 路由等核心创新
3. **渐进式重构** - 分阶段实施，降低风险
4. **面向未来** - 为 MCP、Monorepo、插件系统预留空间

通过这次重构，Mechanical Revolution 将拥有：
- ✅ 更清晰的代码组织
- ✅ 更好的可维护性
- ✅ 更强的可扩展性
- ✅ 更专业的架构

同时避免了：
- ❌ 重复造轮子
- ❌ 架构混乱
- ❌ 难以扩展
- ❌ 代码难以理解

---

**创建日期**: 2026-02-28
**状态**: 📋 待实施
**预计工期**: 2-3 周（分阶段实施）
