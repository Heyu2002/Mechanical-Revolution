import { C } from "./colors.js";

export function printBanner(): void {
  console.log(`
${C.cyan}${C.bold}  ╔══════════════════════════════════════╗
  ║     Mechanical Revolution  v0.1.0    ║
  ║       Multi-Agent CLI Framework      ║
  ╚══════════════════════════════════════╝${C.reset}
`);
}

export function printHelp(): void {
  console.log(`
${C.bold}Commands:${C.reset}

  ${C.cyan}/provider${C.reset}            List available providers
  ${C.cyan}/provider <name>${C.reset}     Switch to a provider (e.g. /provider claude)
  ${C.cyan}/agents${C.reset}              List registered agents
  ${C.cyan}/agent <name>${C.reset}        Switch active agent
  ${C.cyan}/clear${C.reset}               Clear conversation history
  ${C.cyan}/verbose${C.reset}             Toggle verbose mode (show LLM calls, tool results)
  ${C.cyan}/skills${C.reset}              List all available skills
  ${C.cyan}/skill <name>${C.reset}        Show skill details
  ${C.cyan}/help${C.reset}                Show this help
  ${C.cyan}/quit${C.reset}                Exit

${C.bold}Provider names:${C.reset}
  claude = Anthropic Claude    openai = OpenAI GPT
  doubao = ByteDance Doubao    qwen = Alibaba Qwen
  deepseek = DeepSeek          ollama = Local Ollama
`);
}
