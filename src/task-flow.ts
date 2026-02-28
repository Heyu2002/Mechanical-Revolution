import { randomUUID } from "node:crypto";
import type { TaskFlow, TaskFlowNode, TaskState, TaskStatus } from "./types.js";

/**
 * TaskFlowTracker — tracks the complete flow of tasks across agents.
 *
 * Inspired by A2A protocol's Task lifecycle:
 * - Each agent execution creates a TaskFlowNode
 * - Handoffs create new child tasks linked to the parent
 * - The full flow is a chain: user → agent A → agent B → ...
 * - At any point, exactly one task is "active" (working state)
 */
export class TaskFlowTracker {
  private flow: TaskFlow;

  constructor() {
    this.flow = {
      contextId: randomUUID(),
      tasks: [],
      startTime: Date.now(),
    };
  }

  get contextId(): string {
    return this.flow.contextId;
  }

  get activeTask(): TaskFlowNode | undefined {
    return this.flow.tasks.find((t) => t.taskId === this.flow.activeTaskId);
  }

  /**
   * Create a new task in the flow.
   */
  createTask(opts: {
    targetAgent: string;
    provider: string;
    model: string;
    input: string;
    sourceAgent?: string;
  }): TaskFlowNode {
    const taskId = randomUUID().slice(0, 8);
    const now = Date.now();

    const task: TaskFlowNode = {
      taskId,
      contextId: this.flow.contextId,
      sourceAgent: opts.sourceAgent,
      targetAgent: opts.targetAgent,
      provider: opts.provider,
      model: opts.model,
      input: opts.input,
      statusHistory: [{ state: "submitted", timestamp: now }],
      currentState: "submitted",
      toolCalls: [],
      startTime: now,
    };

    this.flow.tasks.push(task);
    this.flow.activeTaskId = taskId;
    return task;
  }

  /**
   * Transition a task to a new state.
   */
  transition(taskId: string, state: TaskState, message?: string): void {
    const task = this.getTask(taskId);
    if (!task) return;

    const status: TaskStatus = {
      state,
      message,
      timestamp: Date.now(),
    };

    task.statusHistory.push(status);
    task.currentState = state;

    if (state === "working") {
      this.flow.activeTaskId = taskId;
    }

    if (state === "completed" || state === "failed" || state === "canceled") {
      task.endTime = Date.now();
      // If this was the active task, clear it
      if (this.flow.activeTaskId === taskId) {
        this.flow.activeTaskId = undefined;
      }
    }
  }

  /**
   * Record a handoff: mark current task as "handoff" state,
   * create a new child task for the target agent.
   */
  handoff(
    parentTaskId: string,
    targetAgent: string,
    provider: string,
    model: string,
    reason?: string
  ): TaskFlowNode {
    const parent = this.getTask(parentTaskId);
    if (parent) {
      this.transition(parentTaskId, "handoff", reason);
    }

    const childTask = this.createTask({
      targetAgent,
      provider,
      model,
      input: reason ?? "",
      sourceAgent: parent?.targetAgent,
    });

    if (parent) {
      parent.childTaskId = childTask.taskId;
    }

    return childTask;
  }

  /**
   * Record a tool call on a task.
   */
  addToolCall(taskId: string, toolName: string, args: unknown): void {
    const task = this.getTask(taskId);
    if (task) {
      task.toolCalls.push({ toolName, args });
    }
  }

  /**
   * Record a tool result on the last tool call of a task.
   */
  addToolResult(taskId: string, toolName: string, result: unknown): void {
    const task = this.getTask(taskId);
    if (!task) return;
    const tc = [...task.toolCalls].reverse().find((t) => t.toolName === toolName);
    if (tc) {
      tc.result = result;
    }
  }

  /**
   * Complete a task with output.
   */
  complete(taskId: string, output: string): void {
    const task = this.getTask(taskId);
    if (task) {
      task.output = output;
      this.transition(taskId, "completed");
    }
  }

  /**
   * Fail a task with error.
   */
  fail(taskId: string, error: string): void {
    const task = this.getTask(taskId);
    if (task) {
      task.error = error;
      this.transition(taskId, "failed");
    }
  }

  /**
   * Get the complete flow.
   */
  getFlow(): TaskFlow {
    this.flow.endTime = Date.now();
    return this.flow;
  }

  /**
   * Get a task by ID.
   */
  getTask(taskId: string): TaskFlowNode | undefined {
    return this.flow.tasks.find((t) => t.taskId === taskId);
  }

  /**
   * Get the flow chain as an ordered list of agent names.
   */
  getFlowChain(): string[] {
    return this.flow.tasks.map((t) => t.targetAgent);
  }
}
