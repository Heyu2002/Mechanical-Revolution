# 中文输入光标位置修复

## 问题描述

在 Windows Terminal 中输入中文字符时，光标位置显示不正确，总是出现在输入的中间而不是末尾。

### 原因分析

中文字符在终端中占用 **2 个字符宽度**（full-width characters），但 JavaScript 的 `string.length` 只计算 **字符数量**，不考虑显示宽度。

**示例**：
```
输入: "你好"
string.length: 2 (2个字符)
终端显示宽度: 4 (每个中文字符占2列)
```

**原代码问题**：
```typescript
// autocomplete.ts line 367 (修复前)
process.stdout.write(`\r\x1b[${6 + this.cursorPos}C`);
```

这里 `this.cursorPos` 使用的是字符数量，导致：
- 输入 "你好" 时，`cursorPos = 2`
- 光标移动到第 `6 + 2 = 8` 列
- 但实际应该在第 `6 + 4 = 10` 列（"you > " 6列 + "你好" 4列）

## 解决方案

使用 `string-width` 库计算字符串的实际显示宽度。

### 1. 安装依赖

```bash
npm install string-width
```

### 2. 修改代码

**src/autocomplete.ts**:

```typescript
// 导入 string-width
import stringWidth from "string-width";

// 在 render() 方法中修改光标定位逻辑
private render(): void {
  // ... 其他代码 ...

  // 修复前：
  // process.stdout.write(`\r\x1b[${6 + this.cursorPos}C`);

  // 修复后：
  const inputBeforeCursor = this.input.slice(0, this.cursorPos);
  const displayWidth = stringWidth(inputBeforeCursor);
  process.stdout.write(`\r\x1b[${6 + displayWidth}C`);
}
```

### 3. 工作原理

`string-width` 库会正确计算每个字符的显示宽度：
- ASCII 字符（a-z, 0-9）: 1 列
- 中文字符（你好世界）: 2 列
- Emoji（😀）: 2 列
- 零宽字符: 0 列

**示例**：
```typescript
import stringWidth from "string-width";

stringWidth("hello");      // 5
stringWidth("你好");        // 4
stringWidth("hello世界");   // 9 (5 + 4)
stringWidth("😀");         // 2
```

## 测试

运行测试脚本验证修复：

```bash
node test-chinese-cursor.js
```

**测试步骤**：
1. 输入中文字符（如：你好世界）
2. 使用左右箭头键移动光标
3. 观察光标是否始终在正确位置
4. 按 Enter 提交

**预期结果**：
- ✅ 光标始终在输入末尾
- ✅ 左右箭头键移动光标位置正确
- ✅ 删除字符时光标位置正确
- ✅ 混合中英文输入时光标位置正确

## 技术细节

### East Asian Width 标准

`string-width` 库基于 Unicode East Asian Width 标准（UAX #11）：

| 类别 | 宽度 | 示例 |
|------|------|------|
| Halfwidth | 1 | ASCII 字符 (a-z, 0-9) |
| Fullwidth | 2 | 中文字符 (你好), 全角符号 (！？) |
| Wide | 2 | 日文假名 (あア), 韩文 (한글) |
| Narrow | 1 | 半角片假名 (ｱｲｳ) |
| Ambiguous | 1 或 2 | 取决于终端设置 |
| Neutral | 1 | 大多数符号 |

### ANSI 转义序列

光标定位使用的 ANSI 转义序列：
- `\r` - 回到行首
- `\x1b[${n}C` - 向右移动 n 列
- `\x1b[${n}A` - 向上移动 n 行

**完整流程**：
```typescript
// 1. 回到行首
process.stdout.write("\r");

// 2. 向右移动到正确位置
// "you > " = 6 列 + 输入内容的显示宽度
const displayWidth = stringWidth(inputBeforeCursor);
process.stdout.write(`\x1b[${6 + displayWidth}C`);
```

## 相关问题

### 为什么 Claude Code CLI 没有这个问题？

Claude Code CLI 可能使用了类似的解决方案：
1. 使用 `string-width` 或类似库
2. 使用 raw mode 输入 + 手动光标定位
3. 正确处理多字节字符的显示宽度

### 其他终端是否也有这个问题？

这个问题在所有终端都存在，因为：
- 问题根源是 JavaScript 的 `string.length` 不考虑显示宽度
- 所有终端都遵循 East Asian Width 标准
- 修复后在所有终端都能正常工作

## 参考资料

- [Unicode UAX #11: East Asian Width](https://www.unicode.org/reports/tr11/)
- [string-width npm package](https://www.npmjs.com/package/string-width)
- [ANSI escape codes](https://en.wikipedia.org/wiki/ANSI_escape_code)
- [wcwidth specification](https://www.cl.cam.ac.uk/~mgk25/ucs/wcwidth.c)

## 总结

通过使用 `string-width` 库正确计算字符串的显示宽度，成功修复了中文输入时光标位置不正确的问题。这个修复适用于所有多字节字符（中文、日文、韩文、Emoji 等）。
