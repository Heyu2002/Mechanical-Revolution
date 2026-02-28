import { randomUUID } from "node:crypto";
import type { Trace, TraceSpan, TraceSpanType } from "./types.js";

/**
 * Tracer — records structured execution spans for a single run.
 * Created per Runner.run() call. Supports nested spans via a stack.
 */
export class Tracer {
  private trace: Trace;
  private spanStack: string[] = [];

  constructor() {
    this.trace = {
      id: randomUUID(),
      spans: [],
      startTime: Date.now(),
    };
  }

  startSpan(
    name: string,
    type: TraceSpanType,
    input?: unknown
  ): string {
    const span: TraceSpan = {
      id: randomUUID(),
      parentId: this.spanStack.at(-1),
      name,
      type,
      startTime: Date.now(),
      input,
    };
    this.trace.spans.push(span);
    this.spanStack.push(span.id);
    return span.id;
  }

  endSpan(id: string, output?: unknown, error?: string): void {
    const span = this.trace.spans.find((s) => s.id === id);
    if (span) {
      span.endTime = Date.now();
      span.output = output;
      span.error = error;
    }
    // Pop from stack if it's the current top
    if (this.spanStack.at(-1) === id) {
      this.spanStack.pop();
    }
  }

  getTrace(): Trace {
    this.trace.endTime = Date.now();
    return this.trace;
  }
}

/**
 * Format a trace for console output.
 * Shows a tree-like view of spans with timing info.
 */
export function formatTrace(trace: Trace): string {
  const lines: string[] = [];
  lines.push(`\n─── Trace ${trace.id.slice(0, 8)} ───`);

  const totalMs = (trace.endTime ?? Date.now()) - trace.startTime;
  lines.push(`Total: ${totalMs}ms\n`);

  // Build tree from spans
  const rootSpans = trace.spans.filter((s) => !s.parentId);
  for (const span of rootSpans) {
    formatSpan(span, trace.spans, 0, lines);
  }

  lines.push(`─── End Trace ───\n`);
  return lines.join("\n");
}

function formatSpan(
  span: TraceSpan,
  allSpans: TraceSpan[],
  depth: number,
  lines: string[]
): void {
  const indent = "  ".repeat(depth);
  const duration = span.endTime
    ? `${span.endTime - span.startTime}ms`
    : "running";
  const icon = spanIcon(span.type);
  const status = span.error ? `❌ ${span.error}` : "✓";

  lines.push(`${indent}${icon} ${span.name} [${span.type}] ${duration} ${status}`);

  // Recurse into children
  const children = allSpans.filter((s) => s.parentId === span.id);
  for (const child of children) {
    formatSpan(child, allSpans, depth + 1, lines);
  }
}

function spanIcon(type: TraceSpanType): string {
  switch (type) {
    case "agent":
      return "🤖";
    case "llm":
      return "🧠";
    case "tool":
      return "🔧";
    case "handoff":
      return "🔀";
    case "guardrail":
      return "🛡️";
    default:
      return "•";
  }
}
