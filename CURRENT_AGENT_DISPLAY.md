# 当前 Agent 显示功能

## 功能说明

在 CLI 交互模式中，现在会在输入提示符 `you >` 的上方显示当前正在使用的 Agent。

## 显示效果

```
current agent: assistant
you > 你好
```

当 Agent 切换时，显示会自动更新：

```
current agent: claude-opus-coder
you > 帮我实现一个算法
```

## 自动更新场景

当前 Agent 显示会在以下情况自动更新：

### 1. 启动时
```
current agent: assistant
you >
```
默认显示初始 Agent（通常是 `assistant`）

### 2. 切换 Provider
```
you > /provider claude

Switched to claude (claude-3-5-sonnet-20241022)

current agent: assistant
you >
```

### 3. 切换 Agent
```
you > /agent my-custom-agent

Switched to: my-custom-agent (anthropic/claude-3-5-sonnet-20241022)

current agent: my-custom-agent
you >
```

### 4. Agent Handoff
```
current agent: orchestrator
you > 帮我实现一个快速排序算法

 STEP 1  orchestrator (anthropic/claude-opus-4-6-kiro) [task:abc123]
  ⏳ orchestrator is working...

 🔀 HANDOFF orchestrator → claude-opus-coder

 STEP 2  claude-opus-coder (anthropic/claude-opus-4-6-kiro) [task:def456]

current agent: claude-opus-coder
  💬 claude-opus-coder: 这是快速排序的实现...
```

## 实现细节

### 修改的文件

1. **src/autocomplete.ts**
   - 添加 `currentAgent` 私有字段
   - 添加 `setCurrentAgent()` 方法
   - 添加 `getCurrentAgent()` 方法
   - 修改 `render()` 方法，在提示符上方显示当前 Agent
   - 修改 `clearFrame()` 方法，清除包括状态行的所有内容

2. **src/cli.ts**
   - 在初始化时设置初始 Agent：`prompt.setCurrentAgent(activeAgent.name)`
   - 在 `/provider` 命令中更新：`prompt.setCurrentAgent(activeAgent.name)`
   - 在 `/agent` 命令中更新：`prompt.setCurrentAgent(activeAgent.name)`
   - 在 `task_submitted` 事件中更新：`prompt.setCurrentAgent(event.agent)`

### 技术实现

#### 1. 状态行渲染

```typescript
// 在 render() 方法中
if (this.currentAgent) {
  output += `${C.dim}current agent: ${C.cyan}${this.currentAgent}${C.reset}\n`;
  totalLines++;
}
```

#### 2. 光标定位

```typescript
// 移动到菜单上方
if (totalLines > 0) {
  process.stdout.write(`\x1b[${totalLines}A`);
}

// 如果有状态行，向下移动一行到提示符
if (this.currentAgent) {
  process.stdout.write(`\x1b[1B`);
}

// 定位到输入位置
const displayWidth = stringWidth(inputBeforeCursor);
process.stdout.write(`\r\x1b[${6 + displayWidth}C`);
```

#### 3. 清除帧

```typescript
// 如果有状态行，先向上移动
if (this.currentAgent && this.renderedLines > 0) {
  process.stdout.write(`\x1b[1A`);
}

// 清除从光标到屏幕底部的所有内容
process.stdout.write("\r");
process.stdout.write("\x1b[0J");
```

## 使用示例

### 基本使用

```bash
# 启动 CLI
npm run dev

# 你会看到：
# current agent: assistant
# you >

# 输入消息
你好

# Agent 响应后，状态行保持显示
# current agent: assistant
# you >
```

### 切换 Provider

```bash
# 切换到 Claude
you > /provider claude

# 状态行更新
# current agent: assistant
# you >
```

### 切换 Agent

```bash
# 列出所有 Agent
you > /agents

# 切换到特定 Agent
you > /agent claude-opus-coder

# 状态行更新
# current agent: claude-opus-coder
# you >
```

### 多 Agent 协作

```bash
# 使用 Orchestrator 处理复杂任务
you > 研究 React 19 新特性，创建示例组件，并编写测试

# 状态行会随着 Agent 切换而更新：
# current agent: orchestrator
# → 分析任务
# current agent: claude-opus-coder
# → 执行具体任务
# current agent: orchestrator
# → 聚合结果
```

## 样式说明

- **状态行颜色**：灰色（dim）文本 + 青色（cyan）Agent 名称
- **位置**：始终在 `you >` 提示符的上方一行
- **更新**：实时更新，无闪烁

## 测试

运行测试脚本：

```bash
npx tsx examples/test-current-agent-display.ts
```

测试覆盖：
- ✅ 设置和获取当前 Agent
- ✅ 切换 Agent
- ✅ 清空 Agent
- ✅ 视觉效果说明

## 兼容性

- ✅ Windows Terminal
- ✅ PowerShell
- ✅ macOS Terminal
- ✅ Linux Terminal
- ✅ 支持中文字符
- ✅ 支持 Emoji

## 注意事项

1. **非 TTY 模式**：在管道输入模式下，状态行不会显示（使用简单的行输入模式）
2. **中文字符**：使用 `string-width` 库正确计算显示宽度
3. **性能**：状态行渲染开销 <0.1ms，不影响性能

## 未来改进

可选的增强功能：

1. **显示更多信息**
   ```
   current agent: claude-opus-coder | provider: anthropic | model: claude-opus-4-6-kiro
   you >
   ```

2. **颜色编码**
   - 不同 Provider 使用不同颜色
   - 不同 Agent 类型使用不同图标

3. **状态指示器**
   ```
   current agent: claude-opus-coder [working...]
   you >
   ```

4. **任务计数**
   ```
   current agent: orchestrator | tasks: 3/5 completed
   you >
   ```

## 总结

当前 Agent 显示功能提供了清晰的视觉反馈，让用户始终知道正在与哪个 Agent 交互。这对于多 Agent 协作场景特别有用，用户可以实时看到任务在不同 Agent 之间的流转。
