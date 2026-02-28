/**
 * 测试终端中文输入
 */

const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('=== 终端中文输入测试 ===\n');
console.log('请输入一些中文，观察光标位置：\n');

rl.question('输入中文测试: ', (answer) => {
  console.log(`\n你输入的是: ${answer}`);
  console.log(`字符长度: ${answer.length}`);
  console.log(`字节长度: ${Buffer.from(answer).length}`);

  rl.close();
});
