/**
 * AI-Driven Task Router
 *
 * 使用 AI 分析任务并决定分配给哪个 agent
 */

import type { AgentConfig, ProviderConfig } from "../types.js";
import { providerRegistry } from "../providers/registry.js";

export interface TaskRoutingDecision {
  targetAgent: string;
  reasoning: string;
  confidence: number;
  taskType: string;
}

export class AITaskRouter {
  private agents: AgentConfig[];
  private providerName: string;
  private providerConfig: ProviderConfig;

  constructor(agents: AgentConfig[], providerName: string, providerConfig: ProviderConfig) {
    this.agents = agents.filter(a => a.capabilities);
    this.providerName = providerName;
    this.providerConfig = providerConfig;
  }

  /**
   * 使用 AI 分析任务并决定路由
   */
  async route(input: string): Promise<TaskRoutingDecision> {
    // 构建 prompt
    const prompt = this.buildRoutingPrompt(input);

    // 调用 LLM
    const provider = providerRegistry.get(this.providerName, this.providerConfig);
    if (!provider) {
      throw new Error(`Provider ${this.providerName} not found`);
    }

    const response = await provider.complete({
      model: this.providerConfig.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3, // 低温度以获得更确定的结果
      maxTokens: 500,
    });

    // 解析响应
    return this.parseResponse(response.content);
  }

  /**
   * 构建路由 prompt
   */
  private buildRoutingPrompt(input: string): string {
    // 构建 agent 列表
    const agentList = this.agents.map((agent, index) => {
      const cap = agent.capabilities!;
      return `${index + 1}. **${agent.name}**
   - Summary: ${cap.summary}
   - Best for: ${cap.bestFor?.join(", ") || "N/A"}
   - Strengths: ${cap.modelStrengths?.join(", ") || "N/A"}`;
    }).join("\n\n");

    return `You are a task routing expert. Analyze the user's request and decide which agent should handle it.

**Available Agents:**

${agentList}

**User Request:**
"${input}"

**Your Task:**
1. Analyze the user's request
2. Identify the task type (e.g., coding, translation, image_analysis, research)
3. Select the most suitable agent
4. Explain your reasoning

**Response Format (JSON only, no markdown):**
{
  "targetAgent": "agent_name",
  "reasoning": "brief explanation",
  "confidence": 0.95,
  "taskType": "task_type"
}

**Important:**
- Return ONLY valid JSON, no markdown code blocks
- confidence should be between 0 and 1
- targetAgent must be one of: ${this.agents.map(a => a.name).join(", ")}

Response:`;
  }

  /**
   * 解析 AI 响应
   */
  private parseResponse(content: string): TaskRoutingDecision {
    try {
      // 移除可能的 markdown 代码块标记
      let cleaned = content.trim();
      cleaned = cleaned.replace(/^```json\s*/i, "");
      cleaned = cleaned.replace(/^```\s*/i, "");
      cleaned = cleaned.replace(/\s*```$/i, "");
      cleaned = cleaned.trim();

      const decision = JSON.parse(cleaned) as TaskRoutingDecision;

      // 验证
      if (!decision.targetAgent || !decision.reasoning) {
        throw new Error("Invalid response format");
      }

      // 验证 agent 是否存在
      const agentExists = this.agents.some(a => a.name === decision.targetAgent);
      if (!agentExists) {
        throw new Error(`Agent ${decision.targetAgent} not found`);
      }

      return decision;
    } catch (error) {
      console.error("Failed to parse AI response:", content);
      console.error("Error:", error);

      // 降级：返回第一个 agent
      return {
        targetAgent: this.agents[0].name,
        reasoning: "Failed to parse AI response, using default agent",
        confidence: 0.5,
        taskType: "unknown",
      };
    }
  }
}

/**
 * 创建 AI 任务路由器
 */
export function createAIRouter(
  agents: AgentConfig[],
  providerName: string,
  providerConfig: ProviderConfig
): AITaskRouter {
  return new AITaskRouter(agents, providerName, providerConfig);
}
