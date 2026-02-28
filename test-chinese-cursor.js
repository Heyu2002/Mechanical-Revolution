/**
 * 测试中文输入光标位置修复
 * Test Chinese input cursor position fix
 */

import { InteractivePrompt } from "./dist/cli.js";

console.log('=== 中文输入光标位置测试 ===\n');
console.log('请输入中文字符，观察光标是否在输入末尾：\n');
console.log('提示：');
console.log('  - 输入中文字符（如：你好世界）');
console.log('  - 使用左右箭头键移动光标');
console.log('  - 观察光标位置是否正确');
console.log('  - 按 Enter 提交\n');

const prompt = new InteractivePrompt([
  { name: "/test", description: "测试命令", hasArgs: false },
  { name: "/hello", description: "问候命令", hasArgs: false },
]);

async function test() {
  const result = await prompt.prompt();
  console.log(`\n你输入的是: "${result.value}"`);
  console.log(`字符长度: ${result.value.length}`);
  console.log(`显示宽度: ${result.value.split('').reduce((sum, char) => {
    const code = char.charCodeAt(0);
    // 简单判断：中文字符范围
    return sum + (code >= 0x4E00 && code <= 0x9FFF ? 2 : 1);
  }, 0)}`);

  process.exit(0);
}

test().catch(error => {
  console.error('错误:', error);
  process.exit(1);
});
