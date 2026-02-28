/**
 * Memory System - 持久化记忆系统
 *
 * 分为两层：
 * 1. Quick Memory - 快速记忆（热缓存）
 * 2. Deep Memory - 深度记忆（长期存储）
 */

import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";

/**
 * 记忆条目
 */
export interface MemoryEntry {
  id: string;                    // 唯一标识
  timestamp: number;             // 时间戳
  content: string;               // 内容
  context?: string;              // 上下文
  tags?: string[];               // 标签
  importance: number;            // 重要性 (0-1)
  accessCount: number;           // 访问次数
  lastAccessed: number;          // 最后访问时间
  metadata?: Record<string, any>; // 元数据
}

/**
 * 记忆搜索结果
 */
export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;                 // 相关性分数
  source: "quick" | "deep";      // 来源
}

/**
 * 记忆系统配置
 */
export interface MemoryConfig {
  memoryDir?: string;            // 记忆存储目录
  quickMemorySize?: number;      // 快速记忆大小限制
  quickMemoryTTL?: number;       // 快速记忆过期时间（毫秒）
  deepMemoryEnabled?: boolean;   // 是否启用深度记忆
  autoSave?: boolean;            // 自动保存
  saveInterval?: number;         // 保存间隔（毫秒）
}

/**
 * 记忆系统
 */
export class MemorySystem {
  private config: Required<MemoryConfig>;
  private quickMemory: Map<string, MemoryEntry> = new Map();
  private quickMemoryIndex: string[] = []; // LRU 索引
  private deepMemoryPath: string;
  private quickMemoryPath: string;
  private saveTimer?: NodeJS.Timeout;

  constructor(config: MemoryConfig = {}) {
    this.config = {
      memoryDir: config.memoryDir || path.join(process.cwd(), ".memory"),
      quickMemorySize: config.quickMemorySize || 50,
      quickMemoryTTL: config.quickMemoryTTL || 24 * 60 * 60 * 1000, // 24小时
      deepMemoryEnabled: config.deepMemoryEnabled ?? true,
      autoSave: config.autoSave ?? true,
      saveInterval: config.saveInterval || 5 * 60 * 1000, // 5分钟
    };

    this.deepMemoryPath = path.join(this.config.memoryDir, "deep-memory.md");
    this.quickMemoryPath = path.join(this.config.memoryDir, "quick-memory.md");

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

    // 加载现有记忆
    this.loadQuickMemory();

    // 启动自动保存
    if (this.config.autoSave) {
      this.startAutoSave();
    }
  }

  /**
   * 添加记忆
   */
  add(content: string, options: {
    context?: string;
    tags?: string[];
    importance?: number;
    metadata?: Record<string, any>;
  } = {}): string {
    const id = this.generateId(content);
    const now = Date.now();

    const entry: MemoryEntry = {
      id,
      timestamp: now,
      content,
      context: options.context,
      tags: options.tags || [],
      importance: options.importance ?? 0.5,
      accessCount: 0,
      lastAccessed: now,
      metadata: options.metadata,
    };

    // 添加到快速记忆
    this.addToQuickMemory(entry);

    // 如果重要性高，也添加到深度记忆
    if (entry.importance >= 0.7 || this.config.deepMemoryEnabled) {
      this.addToDeepMemory(entry);
    }

    return id;
  }

  /**
   * 搜索记忆
   */
  search(query: string, options: {
    limit?: number;
    minScore?: number;
    source?: "quick" | "deep" | "both";
  } = {}): MemorySearchResult[] {
    const limit = options.limit || 10;
    const minScore = options.minScore || 0.3;
    const source = options.source || "both";

    const results: MemorySearchResult[] = [];

    // 搜索快速记忆
    if (source === "quick" || source === "both") {
      for (const entry of this.quickMemory.values()) {
        const score = this.calculateSimilarity(query, entry);
        if (score >= minScore) {
          results.push({ entry, score, source: "quick" });
          // 更新访问信息
          entry.accessCount++;
          entry.lastAccessed = Date.now();
        }
      }
    }

    // 搜索深度记忆
    if (source === "deep" || source === "both") {
      const deepResults = this.searchDeepMemory(query, minScore);
      results.push(...deepResults);
    }

    // 按分数排序
    results.sort((a, b) => b.score - a.score);

    // 限制结果数量
    return results.slice(0, limit);
  }

  /**
   * 获取记忆
   */
  get(id: string): MemoryEntry | undefined {
    // 先从快速记忆查找
    const quickEntry = this.quickMemory.get(id);
    if (quickEntry) {
      quickEntry.accessCount++;
      quickEntry.lastAccessed = Date.now();
      return quickEntry;
    }

    // 从深度记忆查找
    return this.getFromDeepMemory(id);
  }

  /**
   * 删除记忆
   */
  delete(id: string): boolean {
    // 从快速记忆删除
    const deleted = this.quickMemory.delete(id);
    const index = this.quickMemoryIndex.indexOf(id);
    if (index > -1) {
      this.quickMemoryIndex.splice(index, 1);
    }

    // 从深度记忆删除
    this.deleteFromDeepMemory(id);

    return deleted;
  }

  /**
   * 清空记忆
   */
  clear(source?: "quick" | "deep" | "both"): void {
    const target = source || "both";

    if (target === "quick" || target === "both") {
      this.quickMemory.clear();
      this.quickMemoryIndex = [];
      this.saveQuickMemory();
    }

    if (target === "deep" || target === "both") {
      if (fs.existsSync(this.deepMemoryPath)) {
        fs.writeFileSync(this.deepMemoryPath, "# Deep Memory\n\n");
      }
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    quickMemoryCount: number;
    deepMemoryCount: number;
    totalSize: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const quickCount = this.quickMemory.size;
    const deepCount = this.getDeepMemoryCount();

    let oldest = Date.now();
    let newest = 0;

    for (const entry of this.quickMemory.values()) {
      if (entry.timestamp < oldest) oldest = entry.timestamp;
      if (entry.timestamp > newest) newest = entry.timestamp;
    }

    return {
      quickMemoryCount: quickCount,
      deepMemoryCount: deepCount,
      totalSize: quickCount + deepCount,
      oldestEntry: oldest,
      newestEntry: newest,
    };
  }

  /**
   * 保存记忆
   */
  save(): void {
    this.saveQuickMemory();
  }

  /**
   * 销毁记忆系统
   */
  destroy(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
    }
    this.save();
  }

  // ─── Private Methods ───

  /**
   * 生成记忆 ID
   */
  private generateId(content: string): string {
    return crypto
      .createHash("md5")
      .update(content + Date.now())
      .digest("hex")
      .substring(0, 16);
  }

  /**
   * 添加到快速记忆
   */
  private addToQuickMemory(entry: MemoryEntry): void {
    // 检查是否已存在
    if (this.quickMemory.has(entry.id)) {
      return;
    }

    // 检查容量，使用 LRU 淘汰
    if (this.quickMemory.size >= this.config.quickMemorySize) {
      this.evictLRU();
    }

    // 添加记忆
    this.quickMemory.set(entry.id, entry);
    this.quickMemoryIndex.push(entry.id);
  }

  /**
   * LRU 淘汰
   */
  private evictLRU(): void {
    if (this.quickMemoryIndex.length === 0) return;

    // 找到最少使用的记忆
    let lruId = this.quickMemoryIndex[0];
    let lruScore = Infinity;

    for (const id of this.quickMemoryIndex) {
      const entry = this.quickMemory.get(id);
      if (!entry) continue;

      // 计算分数：访问次数 + 时间衰减
      const timeFactor = (Date.now() - entry.lastAccessed) / this.config.quickMemoryTTL;
      const score = entry.accessCount / (1 + timeFactor);

      if (score < lruScore) {
        lruScore = score;
        lruId = id;
      }
    }

    // 移除最少使用的记忆
    const evicted = this.quickMemory.get(lruId);
    if (evicted && evicted.importance >= 0.5) {
      // 如果重要性较高，移到深度记忆
      this.addToDeepMemory(evicted);
    }

    this.quickMemory.delete(lruId);
    const index = this.quickMemoryIndex.indexOf(lruId);
    if (index > -1) {
      this.quickMemoryIndex.splice(index, 1);
    }
  }

  /**
   * 添加到深度记忆
   */
  private addToDeepMemory(entry: MemoryEntry): void {
    if (!this.config.deepMemoryEnabled) return;

    const markdown = this.entryToMarkdown(entry);

    // 追加到文件
    fs.appendFileSync(this.deepMemoryPath, markdown + "\n---\n\n");
  }

  /**
   * 记忆条目转 Markdown
   */
  private entryToMarkdown(entry: MemoryEntry): string {
    const lines: string[] = [];

    lines.push(`## Memory: ${entry.id}`);
    lines.push("");
    lines.push(`**Timestamp**: ${new Date(entry.timestamp).toISOString()}`);
    lines.push(`**Importance**: ${entry.importance.toFixed(2)}`);
    lines.push(`**Access Count**: ${entry.accessCount}`);

    if (entry.tags && entry.tags.length > 0) {
      lines.push(`**Tags**: ${entry.tags.join(", ")}`);
    }

    if (entry.context) {
      lines.push("");
      lines.push("**Context**:");
      lines.push(entry.context);
    }

    lines.push("");
    lines.push("**Content**:");
    lines.push(entry.content);

    if (entry.metadata) {
      lines.push("");
      lines.push("**Metadata**:");
      lines.push("```json");
      lines.push(JSON.stringify(entry.metadata, null, 2));
      lines.push("```");
    }

    return lines.join("\n");
  }

  /**
   * 计算相似度
   */
  private calculateSimilarity(query: string, entry: MemoryEntry): number {
    const queryLower = query.toLowerCase();
    const contentLower = entry.content.toLowerCase();
    const contextLower = (entry.context || "").toLowerCase();

    let score = 0;

    // 精确匹配
    if (contentLower.includes(queryLower)) {
      score += 0.8;
    }

    // 上下文匹配
    if (contextLower.includes(queryLower)) {
      score += 0.3;
    }

    // 标签匹配
    if (entry.tags) {
      for (const tag of entry.tags) {
        if (tag.toLowerCase().includes(queryLower)) {
          score += 0.2;
        }
      }
    }

    // 词语匹配
    const queryWords = queryLower.split(/\s+/);
    const contentWords = contentLower.split(/\s+/);
    const matchCount = queryWords.filter(w => contentWords.includes(w)).length;
    score += (matchCount / queryWords.length) * 0.5;

    // 重要性加权
    score *= (0.5 + entry.importance * 0.5);

    // 访问频率加权
    const accessFactor = Math.min(entry.accessCount / 10, 1);
    score *= (0.8 + accessFactor * 0.2);

    // 时间衰减
    const age = Date.now() - entry.lastAccessed;
    const ageFactor = Math.exp(-age / this.config.quickMemoryTTL);
    score *= (0.7 + ageFactor * 0.3);

    return Math.min(score, 1);
  }

  /**
   * 搜索深度记忆
   */
  private searchDeepMemory(query: string, minScore: number): MemorySearchResult[] {
    if (!fs.existsSync(this.deepMemoryPath)) {
      return [];
    }

    const content = fs.readFileSync(this.deepMemoryPath, "utf-8");
    const entries = this.parseDeepMemory(content);
    const results: MemorySearchResult[] = [];

    for (const entry of entries) {
      const score = this.calculateSimilarity(query, entry);
      if (score >= minScore) {
        results.push({ entry, score, source: "deep" });
      }
    }

    return results;
  }

  /**
   * 解析深度记忆
   */
  private parseDeepMemory(content: string): MemoryEntry[] {
    const entries: MemoryEntry[] = [];
    const blocks = content.split("---\n\n");

    for (const block of blocks) {
      if (!block.trim()) continue;

      try {
        const entry = this.parseMemoryBlock(block);
        if (entry) {
          entries.push(entry);
        }
      } catch (error) {
        // 忽略解析错误
      }
    }

    return entries;
  }

  /**
   * 解析记忆块
   */
  private parseMemoryBlock(block: string): MemoryEntry | null {
    const lines = block.split("\n");
    const entry: Partial<MemoryEntry> = {
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    let inContent = false;
    let inMetadata = false;
    let contentLines: string[] = [];
    let metadataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith("## Memory: ")) {
        entry.id = line.substring(11).trim();
      } else if (line.startsWith("**Timestamp**:")) {
        entry.timestamp = new Date(line.substring(14).trim()).getTime();
      } else if (line.startsWith("**Importance**:")) {
        entry.importance = parseFloat(line.substring(15).trim());
      } else if (line.startsWith("**Access Count**:")) {
        entry.accessCount = parseInt(line.substring(17).trim());
      } else if (line.startsWith("**Tags**:")) {
        entry.tags = line.substring(9).trim().split(",").map(t => t.trim());
      } else if (line.startsWith("**Context**:")) {
        entry.context = "";
      } else if (line.startsWith("**Content**:")) {
        inContent = true;
      } else if (line.startsWith("**Metadata**:")) {
        inMetadata = true;
      } else if (line.startsWith("```json")) {
        continue;
      } else if (line.startsWith("```")) {
        if (inMetadata) {
          try {
            entry.metadata = JSON.parse(metadataLines.join("\n"));
          } catch (e) {
            // Ignore
          }
          inMetadata = false;
        }
      } else if (inMetadata) {
        metadataLines.push(line);
      } else if (inContent) {
        contentLines.push(line);
      } else if (entry.context !== undefined && !inContent) {
        entry.context += line + "\n";
      }
    }

    if (contentLines.length > 0) {
      entry.content = contentLines.join("\n").trim();
    }

    if (entry.id && entry.content && entry.timestamp) {
      return entry as MemoryEntry;
    }

    return null;
  }

  /**
   * 从深度记忆获取
   */
  private getFromDeepMemory(id: string): MemoryEntry | undefined {
    if (!fs.existsSync(this.deepMemoryPath)) {
      return undefined;
    }

    const content = fs.readFileSync(this.deepMemoryPath, "utf-8");
    const entries = this.parseDeepMemory(content);

    return entries.find(e => e.id === id);
  }

  /**
   * 从深度记忆删除
   */
  private deleteFromDeepMemory(id: string): void {
    if (!fs.existsSync(this.deepMemoryPath)) {
      return;
    }

    const content = fs.readFileSync(this.deepMemoryPath, "utf-8");
    const entries = this.parseDeepMemory(content);
    const filtered = entries.filter(e => e.id !== id);

    // 重新写入
    const lines = ["# Deep Memory\n"];
    for (const entry of filtered) {
      lines.push(this.entryToMarkdown(entry));
      lines.push("\n---\n");
    }

    fs.writeFileSync(this.deepMemoryPath, lines.join("\n"));
  }

  /**
   * 获取深度记忆数量
   */
  private getDeepMemoryCount(): number {
    if (!fs.existsSync(this.deepMemoryPath)) {
      return 0;
    }

    const content = fs.readFileSync(this.deepMemoryPath, "utf-8");
    return this.parseDeepMemory(content).length;
  }

  /**
   * 加载快速记忆
   */
  private loadQuickMemory(): void {
    if (!fs.existsSync(this.quickMemoryPath)) {
      return;
    }

    try {
      const content = fs.readFileSync(this.quickMemoryPath, "utf-8");
      const entries = this.parseDeepMemory(content);

      for (const entry of entries) {
        // 检查是否过期
        const age = Date.now() - entry.lastAccessed;
        if (age < this.config.quickMemoryTTL) {
          this.quickMemory.set(entry.id, entry);
          this.quickMemoryIndex.push(entry.id);
        }
      }
    } catch (error) {
      console.error("Failed to load quick memory:", error);
    }
  }

  /**
   * 保存快速记忆
   */
  private saveQuickMemory(): void {
    const lines = ["# Quick Memory\n"];

    for (const entry of this.quickMemory.values()) {
      lines.push(this.entryToMarkdown(entry));
      lines.push("\n---\n");
    }

    fs.writeFileSync(this.quickMemoryPath, lines.join("\n"));
  }

  /**
   * 启动自动保存
   */
  private startAutoSave(): void {
    this.saveTimer = setInterval(() => {
      this.save();
    }, this.config.saveInterval);
  }
}

/**
 * 创建记忆系统
 */
export function createMemorySystem(config?: MemoryConfig): MemorySystem {
  return new MemorySystem(config);
}
