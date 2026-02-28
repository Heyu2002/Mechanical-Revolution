/**
 * Minimal test — directly call Doubao API to debug 401 error.
 * Usage: npx tsx examples/test-doubao.ts
 */
import OpenAI from "openai";
import { loadConfig } from "../src/config.js";

const config = loadConfig();
const doubao = config.providers["doubao"];

if (!doubao) {
  console.error("No doubao provider in config");
  process.exit(1);
}

console.log("Provider config:");
console.log(`  baseUrl: ${doubao.baseUrl}`);
console.log(`  model: ${doubao.model}`);
console.log(`  apiKey: ${doubao.apiKey.slice(0, 8)}...`);
console.log(`  apiType: ${doubao.apiType}`);
console.log(`  nativeToolCall: ${doubao.nativeToolCall}`);
console.log();

// Direct OpenAI SDK call — same as jarvis does
const client = new OpenAI({
  apiKey: doubao.apiKey,
  baseURL: doubao.baseUrl,
});

console.log("Calling Doubao API...\n");

try {
  const response = await client.chat.completions.create({
    model: doubao.model,
    max_tokens: 256,
    messages: [
      { role: "user", content: "Hello, say hi in one sentence." },
    ],
  });

  console.log("✅ Success!");
  console.log(`Model: ${response.model}`);
  console.log(`Response: ${response.choices[0].message.content}`);
} catch (err: any) {
  console.error("❌ Failed!");
  console.error(`Status: ${err.status}`);
  console.error(`Message: ${err.message}`);

  if (err.status === 401) {
    console.error("\n401 = API Key invalid or expired.");
    console.error("Check if the key works in jarvis. If jarvis works, the key is fine");
    console.error("and the issue might be in how we pass headers.");
  }
}
