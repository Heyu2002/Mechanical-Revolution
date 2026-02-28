import Anthropic from "@anthropic-ai/sdk";
import { BaseProvider } from "./base.js";
import type {
  ProviderConfig,
  ProviderRequestOptions,
  ProviderResponse,
  ProviderStreamChunk,
  Message,
  ProviderToolSchema,
  ToolCall,
} from "../types.js";
import { buildToolCallPrompt, parseToolCallFromText } from "./tool-prompt.js";

/**
 * Anthropic Provider — uses the Messages API.
 *
 * Handles format differences: system prompt is a separate param,
 * tool use comes as content blocks, etc.
 *
 * Also supports nativeToolCall=false mode (prompt-based tool simulation),
 * though Anthropic typically supports native tool calls.
 */
export class AnthropicProvider extends BaseProvider {
  private client: Anthropic;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
      baseURL: config.baseUrl || undefined,
    });
  }

  async complete(options: ProviderRequestOptions): Promise<ProviderResponse> {
    const { systemPrompt, messages } = this.extractSystem(
      this.prepareMessages(options)
    );
    const useNativeTools = this.nativeToolCall && options.tools?.length;

    const response = await this.client.messages.create({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      system: systemPrompt || undefined,
      messages: this.toProviderMessages(messages) as Anthropic.MessageParam[],
      tools: useNativeTools
        ? (this.toProviderTools(options.tools!) as Anthropic.Tool[])
        : undefined,
      temperature: options.temperature,
      top_p: options.topP,
    });

    let content = "";
    const toolCalls: ToolCall[] = [];

    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      } else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          name: block.name,
          arguments: JSON.stringify(block.input),
        });
      }
    }

    // For non-native tool call, parse from text
    if (!this.nativeToolCall && options.tools?.length && content) {
      const parsed = parseToolCallFromText(content);
      if (parsed) {
        toolCalls.push(parsed);
      }
    }

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        promptTokens: response.usage.input_tokens,
        completionTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      finishReason: this.mapStopReason(response.stop_reason),
    };
  }

  async *stream(
    options: ProviderRequestOptions
  ): AsyncIterable<ProviderStreamChunk> {
    const { systemPrompt, messages } = this.extractSystem(
      this.prepareMessages(options)
    );
    const useNativeTools = this.nativeToolCall && options.tools?.length;

    const stream = this.client.messages.stream({
      model: options.model,
      max_tokens: options.maxTokens ?? 4096,
      system: systemPrompt || undefined,
      messages: this.toProviderMessages(messages) as Anthropic.MessageParam[],
      tools: useNativeTools
        ? (this.toProviderTools(options.tools!) as Anthropic.Tool[])
        : undefined,
      temperature: options.temperature,
      top_p: options.topP,
    });

    let currentToolCall: Partial<ToolCall> | null = null;
    let toolInputJson = "";

    for await (const event of stream) {
      if (event.type === "content_block_start") {
        const block = event.content_block;
        if (block.type === "tool_use") {
          currentToolCall = { id: block.id, name: block.name, arguments: "" };
          toolInputJson = "";
        }
      } else if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          yield { type: "text_delta", content: event.delta.text };
        } else if (event.delta.type === "input_json_delta") {
          toolInputJson += event.delta.partial_json;
          if (currentToolCall) {
            yield {
              type: "tool_call_delta",
              toolCall: { ...currentToolCall, arguments: toolInputJson },
            };
          }
        }
      } else if (event.type === "content_block_stop") {
        if (currentToolCall) {
          currentToolCall.arguments = toolInputJson;
          currentToolCall = null;
          toolInputJson = "";
        }
      } else if (event.type === "message_stop") {
        yield { type: "done" };
      }
    }
  }

  /**
   * For non-native tool call, inject tool descriptions into system prompt.
   */
  private prepareMessages(options: ProviderRequestOptions): Message[] {
    if (this.nativeToolCall || !options.tools?.length) {
      return options.messages;
    }

    const toolPrompt = buildToolCallPrompt(options.tools);
    const messages = [...options.messages];
    const systemIdx = messages.findIndex((m) => m.role === "system");

    if (systemIdx >= 0) {
      messages[systemIdx] = {
        ...messages[systemIdx],
        content: messages[systemIdx].content + "\n\n" + toolPrompt,
      };
    } else {
      messages.unshift({ role: "system", content: toolPrompt });
    }

    return messages;
  }

  private extractSystem(messages: Message[]): {
    systemPrompt: string;
    messages: Message[];
  } {
    const systemMessages = messages.filter((m) => m.role === "system");
    const otherMessages = messages.filter((m) => m.role !== "system");
    const systemPrompt = systemMessages.map((m) => m.content).join("\n\n");
    return { systemPrompt, messages: otherMessages };
  }

  protected toProviderMessages(messages: Message[]): unknown[] {
    const result: unknown[] = [];

    for (const msg of messages) {
      if (msg.role === "assistant" && msg.toolCalls?.length) {
        const content: unknown[] = [];
        if (msg.content) {
          content.push({ type: "text", text: msg.content });
        }
        for (const tc of msg.toolCalls) {
          content.push({
            type: "tool_use",
            id: tc.id,
            name: tc.name,
            input: JSON.parse(tc.arguments),
          });
        }
        result.push({ role: "assistant", content });
      } else if (msg.role === "tool") {
        if (!this.nativeToolCall) {
          result.push({
            role: "user",
            content: `[Tool Result] ${msg.name}: ${msg.content}`,
          });
        } else {
          result.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: msg.toolCallId,
                content: msg.content,
              },
            ],
          });
        }
      } else {
        result.push({
          role: msg.role === "system" ? "user" : msg.role,
          content: msg.content,
        });
      }
    }

    return result;
  }

  protected toProviderTools(tools: ProviderToolSchema[]): unknown[] {
    return tools.map((t) => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  private mapStopReason(
    reason: string | null
  ): ProviderResponse["finishReason"] {
    switch (reason) {
      case "end_turn":
        return "stop";
      case "tool_use":
        return "tool_calls";
      case "max_tokens":
        return "length";
      default:
        return "stop";
    }
  }
}
