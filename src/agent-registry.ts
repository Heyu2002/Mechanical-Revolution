/**
 * Agent Registry
 *
 * 管理所有 Agent 的注册、加载和查询
 * 支持：
 * - 内置 Agent
 * - 用户级 Agent (~/.mechanical-revolution/agents/)
 * - 项目级 Agent (.agents/)
 * - 热重载
 */

import * as fs from "fs";
import * as path from "path";
import { EventEmitter } from "events";
import type { AgentConfig } from "./types.js";
import { parseAgentMarkdown } from "./agent-loader.js";

export interface AgentRegistryOptions {
  userAgentsDir?: string;       // 用户级 Agent 目录
  projectAgentsDir?: string;    // 项目级 Agent 目录
  enableHotReload?: boolean;    // 是否启用热重载
}

export class AgentRegistry extends EventEmitter {
  private agents = new Map<string, AgentConfig>();
  private watchers = new Map<string, fs.FSWatcher>();
  private options: Required<AgentRegistryOptions>;

  constructor(options: AgentRegistryOptions = {}) {
    super();
    this.options = {
      userAgentsDir: options.userAgentsDir || this.getUserAgentsDir(),
      projectAgentsDir: options.projectAgentsDir || this.getProjectAgentsDir(),
      enableHotReload: options.enableHotReload ?? true,
    };
  }

  /**
   * 加载所有 Agent
   */
  async loadAll(): Promise<void> {
    // 1. 加载内置 Agent（由调用者通过 registerBuiltin 注册）
    // 内置 Agent 在代码中定义，不从文件加载

    // 2. 加载用户级 Agent
    await this.loadFromDirectory(this.options.userAgentsDir, "user");

    // 3. 加载项目级 Agent
    await this.loadFromDirectory(this.options.projectAgentsDir, "project");

    // 4. 启动热重载
    if (this.options.enableHotReload) {
      this.watchDirectories();
    }

    this.emit("loaded", this.agents.size);
  }

  /**
   * 从目录加载 Agent
   */
  async loadFromDirectory(dir: string, source: "user" | "project"): Promise<void> {
    if (!fs.existsSync(dir)) {
      return;
    }

    const files = fs.readdirSync(dir);
    const mdFiles = files.filter(f => f.endsWith(".md"));

    for (const file of mdFiles) {
      const filePath = path.join(dir, file);
      try {
        await this.loadFromFile(filePath, source);
      } catch (error) {
        console.error(`Failed to load agent from ${filePath}:`, error);
      }
    }
  }

  /**
   * 从 Markdown 文件加载 Agent
   */
  async loadFromFile(filePath: string, source: "user" | "project"): Promise<void> {
    const content = await fs.promises.readFile(filePath, "utf-8");
    const agent = parseAgentMarkdown(content);

    // 添加元数据
    agent.source = source;
    agent.filePath = filePath;

    this.register(agent);
    this.emit("agent-loaded", agent);
  }

  /**
   * 注册 Agent
   */
  register(agent: AgentConfig): void {
    this.agents.set(agent.name, agent);
    this.emit("agent-registered", agent);
  }

  /**
   * 注册内置 Agent
   */
  registerBuiltin(agent: AgentConfig): void {
    agent.source = "builtin";
    this.register(agent);
  }

  /**
   * 批量注册内置 Agent
   */
  registerBuiltins(agents: AgentConfig[]): void {
    agents.forEach(agent => this.registerBuiltin(agent));
  }

  /**
   * 获取 Agent
   */
  get(name: string): AgentConfig | undefined {
    return this.agents.get(name);
  }

  /**
   * 检查 Agent 是否存在
   */
  has(name: string): boolean {
    return this.agents.has(name);
  }

  /**
   * 列出所有 Agent
   */
  list(): AgentConfig[] {
    return Array.from(this.agents.values());
  }

  /**
   * 按来源列出 Agent
   */
  listBySource(source: "builtin" | "user" | "project"): AgentConfig[] {
    return this.list().filter(agent => agent.source === source);
  }

  /**
   * 搜索 Agent（按名称或描述）
   */
  search(query: string): AgentConfig[] {
    const lowerQuery = query.toLowerCase();
    return this.list().filter(agent => {
      return (
        agent.name.toLowerCase().includes(lowerQuery) ||
        agent.description?.toLowerCase().includes(lowerQuery) ||
        agent.capabilities?.summary.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 注销 Agent
   */
  unregister(name: string): boolean {
    const deleted = this.agents.delete(name);
    if (deleted) {
      this.emit("agent-unregistered", name);
    }
    return deleted;
  }

  /**
   * 清空所有 Agent
   */
  clear(): void {
    this.agents.clear();
    this.emit("cleared");
  }

  /**
   * 热重载：监听目录变化
   */
  private watchDirectories(): void {
    const dirs = [
      { path: this.options.userAgentsDir, source: "user" as const },
      { path: this.options.projectAgentsDir, source: "project" as const },
    ];

    for (const { path: dir, source } of dirs) {
      if (!fs.existsSync(dir)) {
        continue;
      }

      try {
        const watcher = fs.watch(dir, async (eventType, filename) => {
          if (!filename || !filename.endsWith(".md")) {
            return;
          }

          const filePath = path.join(dir, filename);

          if (eventType === "rename") {
            // 文件删除或重命名
            if (!fs.existsSync(filePath)) {
              // 找到并删除对应的 Agent
              const agent = this.list().find(a => a.filePath === filePath);
              if (agent) {
                this.unregister(agent.name);
                this.emit("agent-removed", agent.name);
              }
            } else {
              // 新文件创建
              await this.loadFromFile(filePath, source);
              this.emit("agent-added", filePath);
            }
          } else if (eventType === "change") {
            // 文件修改
            await this.loadFromFile(filePath, source);
            this.emit("agent-reloaded", filePath);
          }
        });

        this.watchers.set(dir, watcher);
      } catch (error) {
        console.error(`Failed to watch directory ${dir}:`, error);
      }
    }
  }

  /**
   * 停止热重载
   */
  stopWatching(): void {
    for (const watcher of this.watchers.values()) {
      watcher.close();
    }
    this.watchers.clear();
  }

  /**
   * 获取用户级 Agent 目录
   */
  private getUserAgentsDir(): string {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    return path.join(homeDir, ".mechanical-revolution", "agents");
  }

  /**
   * 获取项目级 Agent 目录
   */
  private getProjectAgentsDir(): string {
    return path.join(process.cwd(), ".agents");
  }

  /**
   * 销毁注册表
   */
  destroy(): void {
    this.stopWatching();
    this.clear();
    this.removeAllListeners();
  }
}
