/**
 * Task Memory System - 任务记忆系统
 *
 * 基于 JSON 格式存储任务执行信息
 * 分为两层：
 * 1. Quick Memory - 快速记忆（单个 JSON 文件，热缓存）
 * 2. Deep Memory - 深度记忆（多个 JSON 文件，按日期区分）
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/**
 * 任务步骤信息
 */
export interface TaskStep {
  stepNumber: number;           // 步骤编号
  agent: string;                // 执行的 agent
  provider: string;             // 使用的 provider
  model: string;                // 使用的模型
  input: string;                // 输入内容
  output?: string;              // 输出内容
  toolCalls?: Array<{           // 工具调用
    toolName: string;
    args: any;
    result?: any;
  }>;
  startTime: number;            // 开始时间
  endTime?: number;             // 结束时间
  duration?: number;            // 执行时长（毫秒）
  status: "pending" | "running" | "completed" | "failed"; // 状态
  error?: string;               // 错误信息
}

/**
 * 任务分解详情
 */
export interface TaskDecomposition {
  isDecomposed: boolean;        // 是否进行了分解
  orchestrator?: string;        // 协调者 agent
  reasoning?: string;           // 分解推理过程
  subtasks?: Array<{            // 子任务列表
    description: string;        // 子任务描述
    assignedAgent: string;      // 分配的 agent
    reason: string;             // 分配原因
    dependencies?: number[];    // 依赖的子任务编号
  }>;
}

/**
 * 任务记忆条目
 */
export interface TaskMemoryEntry {
  id: string;                   // 唯一标识
  date: string;                 // 日期 (YYYY-MM-DD)
  timestamp: number;            // 时间戳

  // 用户输入
  userInput: string;            // 用户原始输入

  // 任务分析
  taskComplexity: {
    level: "chitchat" | "simple_query" | "medium_task" | "complex_task";
    score: number;              // 复杂度分数
    features?: {                // 特征分析
      linguistic: number;
      structural: number;
      contextual: number;
      semantic: number;
    };
  };

  // 执行信息
  executionAgent: string;       // 主执行 agent
  executionProvider: string;    // 使用的 provider
  executionModel: string;       // 使用的模型

  // 任务分解详情
  decomposition: TaskDecomposition;

  // 任务执行步骤
  steps: TaskStep[];            // 执行步骤列表

  // 执行结果
  finalOutput?: string;         // 最终输出
  status: "pending" | "running" | "completed" | "failed"; // 任务状态
  error?: string;               // 错误信息

  // 性能指标
  totalDuration?: number;       // 总执行时长（毫秒）
  totalTokens?: number;         // 总 token 使用量

  // 记忆热度
  heatScore: number;            // 热度分数 (0-100)
  accessCount: number;          // 访问次数
  lastAccessed: number;         // 最后访问时间

  // 元数据
  metadata?: Record<string, any>;
}

/**
 * 快速记忆（单个 JSON 文件）
 */
export interface QuickMemory {
  version: string;              // 版本号
  lastUpdated: number;          // 最后更新时间
  entries: TaskMemoryEntry[];   // 记忆条目列表
}

/**
 * 深度记忆（按日期的 JSON 文件）
 */
export interface DeepMemory {
  date: string;                 // 日期 (YYYY-MM-DD)
  version: string;              // 版本号
  entries: TaskMemoryEntry[];   // 该日期的所有记忆条目
}

/**
 * 记忆搜索结果
 */
export interface TaskMemorySearchResult {
  entry: TaskMemoryEntry;
  score: number;                // 相关性分数
  source: "quick" | "deep";     // 来源
  matchReason: string;          // 匹配原因
}

/**
 * 记忆系统配置
 */
export interface TaskMemoryConfig {
  memoryDir?: string;           // 记忆存储目录
  quickMemorySize?: number;     // 快速记忆大小限制
  quickMemoryTTL?: number;      // 快速记忆过期时间（毫秒）
  deepMemoryEnabled?: boolean;  // 是否启用深度记忆
  autoSave?: boolean;           // 自动保存
  saveInterval?: number;        // 保存间隔（毫秒）
  heatDecayRate?: number;       // 热度衰减率 (0-1)
}

/**
 * 任务记忆系统
 */
export class TaskMemorySystem {
  private config: Required<TaskMemoryConfig>;
  private quickMemory: QuickMemory;
  private quickMemoryPath: string;
  private deepMemoryDir: string;
  private saveTimer?: NodeJS.Timeout;

  constructor(config: TaskMemoryConfig = {}) {
    this.config = {
      memoryDir: config.memoryDir || path.join(process.cwd(), ".memory"),
      quickMemorySize: config.quickMemorySize || 50,
      quickMemoryTTL: config.quickMemoryTTL || 24 * 60 * 60 * 1000, // 24小时
      deepMemoryEnabled: config.deepMemoryEnabled ?? true,
      autoSave: config.autoSave ?? true,
      saveInterval: config.saveInterval || 5 * 60 * 1000, // 5分钟
      heatDecayRate: config.heatDecayRate || 0.95, // 每天衰减 5%
    };

    this.quickMemoryPath = path.join(this.config.memoryDir, "quick-memory.json");
    this.deepMemoryDir = path.join(this.config.memoryDir, "deep");

    this.quickMemory = {
      version: "1.0.0",
      lastUpdated: Date.now(),
      entries: []
    };

    this.initialize();
  }

  /**
   * 初始化记忆系统
   */
  private initialize(): void {
    // 创建记忆目录
    if (!fs.existsSync(this.config.memoryDir)) {
      fs.mkdirSync(this.config.memoryDir, { recursive: true });
    }

    if (!fs.existsSync(this.deepMemoryDir)) {
      fs.mkdirSync(this.deepMemoryDir, { recursive: true });
    }

    // 加载快速记忆
    this.loadQuickMemory();

    // 启动自动保存
    if (this.config.autoSave) {
      this.startAutoSave();
    }
  }

  /**
   * 加载快速记忆
   */
  private loadQuickMemory(): void {
    if (fs.existsSync(this.quickMemoryPath)) {
      try {
        const data = fs.readFileSync(this.quickMemoryPath, "utf-8");
        this.quickMemory = JSON.parse(data);

        // 清理过期记忆
        this.cleanExpiredMemories();
      } catch (err) {
        console.warn(`Failed to load quick memory: ${err}`);
      }
    }
  }

  /**
   * 清理过期记忆
   */
  private cleanExpiredMemories(): void {
    const now = Date.now();
    const ttl = this.config.quickMemoryTTL;

    this.quickMemory.entries = this.quickMemory.entries.filter(entry => {
      return (now - entry.timestamp) < ttl;
    });
  }

  /**
   * 添加任务记忆
   */
  add(entry: Omit<TaskMemoryEntry, "id" | "date" | "timestamp" | "heatScore" | "accessCount" | "lastAccessed">): string {
    const now = Date.now();
    const date = new Date(now).toISOString().split("T")[0]; // YYYY-MM-DD

    const memoryEntry: TaskMemoryEntry = {
      id: this.generateId(),
      date,
      timestamp: now,
      heatScore: 100, // 初始热度为 100
      accessCount: 0,
      lastAccessed: now,
      ...entry
    };

    // 添加到快速记忆
    this.quickMemory.entries.push(memoryEntry);
    this.quickMemory.lastUpdated = now;

    // 检查是否需要淘汰
    if (this.quickMemory.entries.length > this.config.quickMemorySize) {
      this.evictLRU();
    }

    // 如果是重要任务（复杂任务或执行时间长），保存到深度记忆
    if (this.config.deepMemoryEnabled && this.shouldSaveToDeep(memoryEntry)) {
      this.saveToDeepMemory(memoryEntry);
    }

    return memoryEntry.id;
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return crypto.randomBytes(8).toString("hex");
  }

  /**
   * 判断是否应该保存到深度记忆
   */
  private shouldSaveToDeep(entry: TaskMemoryEntry): boolean {
    // 复杂任务
    if (entry.taskComplexity.level === "complex_task" || entry.taskComplexity.level === "medium_task") {
      return true;
    }

    // 有任务分解的
    if (entry.decomposition.isDecomposed) {
      return true;
    }

    // 执行时间超过 5 秒的
    if (entry.totalDuration && entry.totalDuration > 5000) {
      return true;
    }

    // 多步骤任务
    if (entry.steps.length > 1) {
      return true;
    }

    return false;
  }

  /**
   * 保存到深度记忆
   */
  private saveToDeepMemory(entry: TaskMemoryEntry): void {
    const deepMemoryPath = path.join(this.deepMemoryDir, `${entry.date}.json`);

    let deepMemory: DeepMemory;

    // 加载或创建该日期的深度记忆
    if (fs.existsSync(deepMemoryPath)) {
      const data = fs.readFileSync(deepMemoryPath, "utf-8");
      deepMemory = JSON.parse(data);
    } else {
      deepMemory = {
        date: entry.date,
        version: "1.0.0",
        entries: []
      };
    }

    // 添加条目
    deepMemory.entries.push(entry);

    // 保存
    fs.writeFileSync(deepMemoryPath, JSON.stringify(deepMemory, null, 2), "utf-8");
  }

  /**
   * LRU 淘汰策略
   */
  private evictLRU(): void {
    if (this.quickMemory.entries.length === 0) return;

    const now = Date.now();

    // 计算每个条目的淘汰分数（越低越容易被淘汰）
    const scores = this.quickMemory.entries.map((entry, index) => {
      const timeSinceAccess = now - entry.lastAccessed;
      const daysSinceAccess = timeSinceAccess / (24 * 60 * 60 * 1000);

      // 分数 = 热度 * 访问次数 / (1 + 天数)
      const score = entry.heatScore * entry.accessCount / (1 + daysSinceAccess);

      return { index, score, entry };
    });

    // 按分数排序，找到最低的
    scores.sort((a, b) => a.score - b.score);

    const toEvict = scores[0];

    // 如果热度还比较高，保存到深度记忆
    if (this.config.deepMemoryEnabled && toEvict.entry.heatScore > 50) {
      this.saveToDeepMemory(toEvict.entry);
    }

    // 从快速记忆中移除
    this.quickMemory.entries.splice(toEvict.index, 1);
  }

  /**
   * 获取记忆
   */
  get(id: string): TaskMemoryEntry | null {
    // 先从快速记忆查找
    const quickEntry = this.quickMemory.entries.find(e => e.id === id);
    if (quickEntry) {
      this.updateAccess(quickEntry);
      return quickEntry;
    }

    // 从深度记忆查找
    if (this.config.deepMemoryEnabled) {
      const deepEntry = this.searchDeepMemory(id);
      if (deepEntry) {
        return deepEntry;
      }
    }

    return null;
  }

  /**
   * 更新访问信息
   */
  private updateAccess(entry: TaskMemoryEntry): void {
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    // 更新热度（访问会增加热度）
    entry.heatScore = Math.min(100, entry.heatScore + 5);
  }

  /**
   * 从深度记忆搜索
   */
  private searchDeepMemory(id: string): TaskMemoryEntry | null {
    const files = fs.readdirSync(this.deepMemoryDir).filter(f => f.endsWith(".json"));

    for (const file of files) {
      const filePath = path.join(this.deepMemoryDir, file);
      const data = fs.readFileSync(filePath, "utf-8");
      const deepMemory: DeepMemory = JSON.parse(data);

      const entry = deepMemory.entries.find(e => e.id === id);
      if (entry) {
        return entry;
      }
    }

    return null;
  }

  /**
   * 搜索记忆
   */
  search(query: string, options: {
    limit?: number;
    minScore?: number;
    source?: "quick" | "deep" | "both";
    dateRange?: { start: string; end: string }; // YYYY-MM-DD
  } = {}): TaskMemorySearchResult[] {
    const {
      limit = 10,
      minScore = 0.3,
      source = "both",
      dateRange
    } = options;

    const results: TaskMemorySearchResult[] = [];

    // 搜索快速记忆
    if (source === "quick" || source === "both") {
      for (const entry of this.quickMemory.entries) {
        const score = this.calculateRelevance(query, entry);
        if (score >= minScore) {
          results.push({
            entry,
            score,
            source: "quick",
            matchReason: this.getMatchReason(query, entry)
          });
        }
      }
    }

    // 搜索深度记忆
    if (this.config.deepMemoryEnabled && (source === "deep" || source === "both")) {
      const deepResults = this.searchDeepMemoryByQuery(query, dateRange);
      for (const entry of deepResults) {
        const score = this.calculateRelevance(query, entry);
        if (score >= minScore) {
          results.push({
            entry,
            score,
            source: "deep",
            matchReason: this.getMatchReason(query, entry)
          });
        }
      }
    }

    // 按分数排序
    results.sort((a, b) => b.score - a.score);

    // 限制结果数量
    return results.slice(0, limit);
  }

  /**
   * 从深度记忆搜索（按查询和日期范围）
   */
  private searchDeepMemoryByQuery(query: string, dateRange?: { start: string; end: string }): TaskMemoryEntry[] {
    const files = fs.readdirSync(this.deepMemoryDir).filter(f => f.endsWith(".json"));
    const results: TaskMemoryEntry[] = [];

    for (const file of files) {
      const date = file.replace(".json", "");

      // 检查日期范围
      if (dateRange) {
        if (date < dateRange.start || date > dateRange.end) {
          continue;
        }
      }

      const filePath = path.join(this.deepMemoryDir, file);
      const data = fs.readFileSync(filePath, "utf-8");
      const deepMemory: DeepMemory = JSON.parse(data);

      results.push(...deepMemory.entries);
    }

    return results;
  }

  /**
   * 计算相关性分数
   */
  private calculateRelevance(query: string, entry: TaskMemoryEntry): number {
    const queryLower = query.toLowerCase();
    let score = 0;

    // 用户输入匹配（权重 0.4）
    if (entry.userInput.toLowerCase().includes(queryLower)) {
      score += 0.4;
    }

    // 最终输出匹配（权重 0.3）
    if (entry.finalOutput && entry.finalOutput.toLowerCase().includes(queryLower)) {
      score += 0.3;
    }

    // 步骤输入/输出匹配（权重 0.2）
    for (const step of entry.steps) {
      if (step.input.toLowerCase().includes(queryLower) ||
          (step.output && step.output.toLowerCase().includes(queryLower))) {
        score += 0.2;
        break;
      }
    }

    // 热度加权（权重 0.1）
    score += (entry.heatScore / 100) * 0.1;

    return Math.min(1, score);
  }

  /**
   * 获取匹配原因
   */
  private getMatchReason(query: string, entry: TaskMemoryEntry): string {
    const queryLower = query.toLowerCase();

    if (entry.userInput.toLowerCase().includes(queryLower)) {
      return "Matched user input";
    }

    if (entry.finalOutput && entry.finalOutput.toLowerCase().includes(queryLower)) {
      return "Matched output";
    }

    for (const step of entry.steps) {
      if (step.input.toLowerCase().includes(queryLower)) {
        return `Matched step ${step.stepNumber} input`;
      }
      if (step.output && step.output.toLowerCase().includes(queryLower)) {
        return `Matched step ${step.stepNumber} output`;
      }
    }

    return "Matched by relevance";
  }

  /**
   * 删除记忆
   */
  delete(id: string): boolean {
    // 从快速记忆删除
    const quickIndex = this.quickMemory.entries.findIndex(e => e.id === id);
    if (quickIndex !== -1) {
      this.quickMemory.entries.splice(quickIndex, 1);
      return true;
    }

    // 从深度记忆删除
    if (this.config.deepMemoryEnabled) {
      return this.deleteFromDeepMemory(id);
    }

    return false;
  }

  /**
   * 从深度记忆删除
   */
  private deleteFromDeepMemory(id: string): boolean {
    const files = fs.readdirSync(this.deepMemoryDir).filter(f => f.endsWith(".json"));

    for (const file of files) {
      const filePath = path.join(this.deepMemoryDir, file);
      const data = fs.readFileSync(filePath, "utf-8");
      const deepMemory: DeepMemory = JSON.parse(data);

      const index = deepMemory.entries.findIndex(e => e.id === id);
      if (index !== -1) {
        deepMemory.entries.splice(index, 1);
        fs.writeFileSync(filePath, JSON.stringify(deepMemory, null, 2), "utf-8");
        return true;
      }
    }

    return false;
  }

  /**
   * 清空记忆
   */
  clear(target: "quick" | "deep" | "both" = "both"): void {
    if (target === "quick" || target === "both") {
      this.quickMemory.entries = [];
      this.quickMemory.lastUpdated = Date.now();
    }

    if (target === "deep" || target === "both") {
      const files = fs.readdirSync(this.deepMemoryDir).filter(f => f.endsWith(".json"));
      for (const file of files) {
        fs.unlinkSync(path.join(this.deepMemoryDir, file));
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    quickMemoryCount: number;
    deepMemoryCount: number;
    deepMemoryDays: number;
    totalSize: number;
    oldestEntry: number;
    newestEntry: number;
    avgHeatScore: number;
    complexTaskCount: number;
    decomposedTaskCount: number;
  } {
    const quickCount = this.quickMemory.entries.length;

    let deepCount = 0;
    let deepDays = 0;
    if (this.config.deepMemoryEnabled) {
      const files = fs.readdirSync(this.deepMemoryDir).filter(f => f.endsWith(".json"));
      deepDays = files.length;

      for (const file of files) {
        const filePath = path.join(this.deepMemoryDir, file);
        const data = fs.readFileSync(filePath, "utf-8");
        const deepMemory: DeepMemory = JSON.parse(data);
        deepCount += deepMemory.entries.length;
      }
    }

    const allEntries = [...this.quickMemory.entries];

    let oldest = Date.now();
    let newest = 0;
    let totalHeat = 0;
    let complexCount = 0;
    let decomposedCount = 0;

    for (const entry of allEntries) {
      if (entry.timestamp < oldest) oldest = entry.timestamp;
      if (entry.timestamp > newest) newest = entry.timestamp;
      totalHeat += entry.heatScore;

      if (entry.taskComplexity.level === "complex_task") {
        complexCount++;
      }

      if (entry.decomposition.isDecomposed) {
        decomposedCount++;
      }
    }

    return {
      quickMemoryCount: quickCount,
      deepMemoryCount: deepCount,
      deepMemoryDays: deepDays,
      totalSize: quickCount + deepCount,
      oldestEntry: oldest,
      newestEntry: newest,
      avgHeatScore: allEntries.length > 0 ? totalHeat / allEntries.length : 0,
      complexTaskCount: complexCount,
      decomposedTaskCount: decomposedCount
    };
  }

  /**
   * 衰减热度（定期调用）
   */
  decayHeat(): void {
    for (const entry of this.quickMemory.entries) {
      entry.heatScore *= this.config.heatDecayRate;

      // 热度低于阈值，考虑淘汰
      if (entry.heatScore < 10) {
        // 如果是重要任务，保存到深度记忆
        if (this.config.deepMemoryEnabled && this.shouldSaveToDeep(entry)) {
          this.saveToDeepMemory(entry);
        }
      }
    }

    // 移除热度过低的条目
    this.quickMemory.entries = this.quickMemory.entries.filter(e => e.heatScore >= 10);
  }

  /**
   * 保存快速记忆
   */
  save(): void {
    try {
      this.quickMemory.lastUpdated = Date.now();
      fs.writeFileSync(
        this.quickMemoryPath,
        JSON.stringify(this.quickMemory, null, 2),
        "utf-8"
      );
    } catch (err) {
      console.error(`Failed to save quick memory: ${err}`);
    }
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(): void {
    this.saveTimer = setInterval(() => {
      this.save();
      this.decayHeat(); // 同时进行热度衰减
    }, this.config.saveInterval);
  }

  /**
   * 停止自动保存
   */
  private stopAutoSave(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = undefined;
    }
  }

  /**
   * 销毁记忆系统
   */
  destroy(): void {
    this.stopAutoSave();
    this.save();
  }
}

/**
 * 创建任务记忆系统
 */
export function createTaskMemorySystem(config?: TaskMemoryConfig): TaskMemorySystem {
  return new TaskMemorySystem(config);
}
