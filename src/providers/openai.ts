import OpenAI from "openai";
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
 * OpenAI-compatible Provider.
 *
 * Serves ALL providers with apiType "openai":
 * OpenAI, Doubao, Qwen, Ollama, DeepSeek, etc.
 *
 * Handles nativeToolCall=false by injecting tool descriptions into the
 * system prompt and parsing tool calls from the LLM's text output.
 */
export class OpenAIProvider extends BaseProvider {
  private client: OpenAI;

  constructor(config: ProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseUrl,
    });
  }

  async complete(options: ProviderRequestOptions): Promise<ProviderResponse> {
    const useNativeTools = this.nativeToolCall && options.tools?.length;
    const messages = this.prepareMessages(options);

    const response = await this.client.chat.completions.create({
      model: options.model,
      messages: this.toProviderMessages(messages) as OpenAI.ChatCompletionMessageParam[],
      tools: useNativeTools
        ? (this.toProviderTools(options.tools!) as OpenAI.ChatCompletionTool[])
        : undefined,
      temperature: options.temperature,
      top_p: options.topP,
      max_tokens: options.maxTokens,
    });

    const choice = response.choices[0];
    const message = choice.message;

    let toolCalls: ToolCall[] | undefined;

    if (useNativeTools && message.tool_calls?.length) {
      // Native tool calls
      toolCalls = message.tool_calls.map((tc) => ({
        id: tc.id,
        name: tc.function.name,
        arguments: tc.function.arguments,
      }));
    } else if (!this.nativeToolCall && options.tools?.length && message.content) {
      // Parse tool calls from text output (prompt-based simulation)
      const parsed = parseToolCallFromText(message.content);
      if (parsed) {
        toolCalls = [parsed];
      }
    }

    return {
      content: message.content ?? "",
      toolCalls,
      usage: response.usage
        ? {
            promptTokens: response.usage.prompt_tokens,
            completionTokens: response.usage.completion_tokens,
            totalTokens: response.usage.total_tokens,
          }
        : undefined,
      finishReason: this.mapFinishReason(choice.finish_reason),
    };
  }

  async *stream(
    options: ProviderRequestOptions
  ): AsyncIterable<ProviderStreamChunk> {
    const useNativeTools = this.nativeToolCall && options.tools?.length;
    const messages = this.prepareMessages(options);

    const stream = await this.client.chat.completions.create({
      model: options.model,
      messages: this.toProviderMessages(messages) as OpenAI.ChatCompletionMessageParam[],
      tools: useNativeTools
        ? (this.toProviderTools(options.tools!) as OpenAI.ChatCompletionTool[])
        : undefined,
      temperature: options.temperature,
      top_p: options.topP,
      max_tokens: options.maxTokens,
      stream: true,
    });

    const toolCallBuffers = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();
    let fullText = "";

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        fullText += delta.content;
        yield { type: "text_delta", content: delta.content };
      }

      if (useNativeTools && delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (!toolCallBuffers.has(tc.index)) {
            toolCallBuffers.set(tc.index, {
              id: tc.id ?? "",
              name: tc.function?.name ?? "",
              arguments: "",
            });
          }
          const buf = toolCallBuffers.get(tc.index)!;
          if (tc.id) buf.id = tc.id;
          if (tc.function?.name) buf.name = tc.function.name;
          if (tc.function?.arguments) buf.arguments += tc.function.arguments;

          yield {
            type: "tool_call_delta",
            toolCall: { id: buf.id, name: buf.name, arguments: buf.arguments },
          };
        }
      }

      if (chunk.choices[0]?.finish_reason) {
        yield { type: "done" };
      }
    }
  }

  /**
   * For non-native tool call providers, inject tool descriptions into the system prompt.
   */
  private prepareMessages(options: ProviderRequestOptions): Message[] {
    if (this.nativeToolCall || !options.tools?.length) {
      return options.messages;
    }

    // Inject tool descriptions into system prompt
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

  protected toProviderMessages(messages: Message[]): unknown[] {
    return messages.map((msg) => {
      if (msg.role === "tool") {
        // For non-native tool call, tool results go as user messages
        if (!this.nativeToolCall) {
          return {
            role: "user" as const,
            content: `[Tool Result] ${msg.name}: ${msg.content}`,
          };
        }
        return {
          role: "tool" as const,
          content: msg.content,
          tool_call_id: msg.toolCallId,
        };
      }

      if (msg.role === "assistant" && msg.toolCalls?.length) {
        if (!this.nativeToolCall) {
          // For non-native, tool calls were text-based
          return {
            role: "assistant" as const,
            content: msg.content || null,
          };
        }
        return {
          role: "assistant" as const,
          content: msg.content || null,
          tool_calls: msg.toolCalls.map((tc) => ({
            id: tc.id,
            type: "function" as const,
            function: { name: tc.name, arguments: tc.arguments },
          })),
        };
      }

      return { role: msg.role, content: msg.content };
    });
  }

  protected toProviderTools(tools: ProviderToolSchema[]): unknown[] {
    return tools.map((t) => ({
      type: "function",
      function: {
        name: t.function.name,
        description: t.function.description,
        parameters: t.function.parameters,
      },
    }));
  }

  private mapFinishReason(
    reason: string | null
  ): ProviderResponse["finishReason"] {
    switch (reason) {
      case "stop":
        return "stop";
      case "tool_calls":
        return "tool_calls";
      case "length":
        return "length";
      case "content_filter":
        return "content_filter";
      default:
        return "stop";
    }
  }
}
