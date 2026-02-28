/**
 * Configuration Manager
 *
 * 多层配置系统，支持配置继承和覆盖
 * 优先级（从低到高）：
 * 1. 内置默认配置
 * 2. 用户级配置 (~/.mechanical-revolution/config.json)
 * 3. 项目级配置 (.mechanical-revolution/config.json)
 * 4. 运行时覆盖
 */

import * as fs from "fs";
import * as path from "path";
import type { FrameworkConfig } from "./types.js";

export interface ConfigLayer {
  name: string;
  priority: number;
  data: Partial<FrameworkConfig>;
}

export class ConfigManager {
  private layers: ConfigLayer[] = [];
  private merged: FrameworkConfig | null = null;

  constructor() {
    this.initializeLayers();
  }

  /**
   * 初始化配置层
   */
  private initializeLayers(): void {
    // 1. 内置默认配置
    this.layers.push({
      name: "builtin",
      priority: 0,
      data: this.getBuiltinConfig(),
    });

    // 2. 用户级配置
    const userConfig = this.loadUserConfig();
    if (userConfig) {
      this.layers.push({
        name: "user",
        priority: 1,
        data: userConfig,
      });
    }

    // 3. 项目级配置
    const projectConfig = this.loadProjectConfig();
    if (projectConfig) {
      this.layers.push({
        name: "project",
        priority: 2,
        data: projectConfig,
      });
    }

    // 4. 运行时覆盖层（初始为空）
    this.layers.push({
      name: "runtime",
      priority: 3,
      data: {},
    });

    // 按优先级排序
    this.layers.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取内置默认配置
   */
  private getBuiltinConfig(): Partial<FrameworkConfig> {
    return {
      autonomousMode: false,
      mouseSpeed: 1,
      workspace: process.cwd(),
      providers: {},
      tracing: {
        enabled: false,
        output: "console",
      },
    };
  }

  /**
   * 加载用户级配置
   */
  private loadUserConfig(): Partial<FrameworkConfig> | null {
    const homeDir = process.env.HOME || process.env.USERPROFILE || "";
    const configPath = path.join(homeDir, ".mechanical-revolution", "config.json");

    return this.loadConfigFile(configPath);
  }

  /**
   * 加载项目级配置
   */
  private loadProjectConfig(): Partial<FrameworkConfig> | null {
    const configPath = path.join(process.cwd(), ".mechanical-revolution", "config.json");
    return this.loadConfigFile(configPath);
  }

  /**
   * 从文件加载配置
   */
  private loadConfigFile(filePath: string): Partial<FrameworkConfig> | null {
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content);
    } catch (error) {
      console.error(`Failed to load config from ${filePath}:`, error);
      return null;
    }
  }

  /**
   * 获取合并后的配置
   */
  getConfig(): FrameworkConfig {
    if (!this.merged) {
      this.merged = this.mergeAllLayers();
    }
    return this.merged;
  }

  /**
   * 合并所有配置层
   */
  private mergeAllLayers(): FrameworkConfig {
    let result: any = {};

    for (const layer of this.layers) {
      result = this.deepMerge(result, layer.data);
    }

    return result as FrameworkConfig;
  }

  /**
   * 深度合并对象
   */
  private deepMerge(target: any, source: any): any {
    const result = { ...target };

    for (const key in source) {
      if (source[key] === undefined) {
        continue;
      }

      if (this.isPlainObject(source[key]) && this.isPlainObject(target[key])) {
        result[key] = this.deepMerge(target[key], source[key]);
      } else {
        result[key] = source[key];
      }
    }

    return result;
  }

  /**
   * 检查是否为普通对象
   */
  private isPlainObject(value: any): boolean {
    return (
      value !== null &&
      typeof value === "object" &&
      value.constructor === Object
    );
  }

  /**
   * 获取指定配置项
   */
  get<T = any>(path: string): T | undefined {
    const config = this.getConfig();
    return this.getByPath(config, path);
  }

  /**
   * 通过路径获取配置值
   */
  private getByPath(obj: any, path: string): any {
    const keys = path.split(".");
    let current = obj;

    for (const key of keys) {
      if (current === undefined || current === null) {
        return undefined;
      }
      current = current[key];
    }

    return current;
  }

  /**
   * 运行时覆盖配置
   */
  override(path: string, value: any): void {
    const runtimeLayer = this.layers.find(l => l.name === "runtime");
    if (!runtimeLayer) {
      throw new Error("Runtime layer not found");
    }

    this.setByPath(runtimeLayer.data, path, value);
    this.merged = null; // 清除缓存，强制重新合并
  }

  /**
   * 批量运行时覆盖
   */
  overrideAll(overrides: Partial<FrameworkConfig>): void {
    const runtimeLayer = this.layers.find(l => l.name === "runtime");
    if (!runtimeLayer) {
      throw new Error("Runtime layer not found");
    }

    runtimeLayer.data = this.deepMerge(runtimeLayer.data, overrides);
    this.merged = null;
  }

  /**
   * 通过路径设置配置值
   */
  private setByPath(obj: any, path: string, value: any): void {
    const keys = path.split(".");
    let current = obj;

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];
      if (!(key in current) || !this.isPlainObject(current[key])) {
        current[key] = {};
      }
      current = current[key];
    }

    current[keys[keys.length - 1]] = value;
  }

  /**
   * 获取指定层的配置
   */
  getLayer(name: string): Partial<FrameworkConfig> | undefined {
    return this.layers.find(l => l.name === name)?.data;
  }

  /**
   * 列出所有配置层
   */
  listLayers(): Array<{ name: string; priority: number }> {
    return this.layers.map(l => ({ name: l.name, priority: l.priority }));
  }

  /**
   * 重新加载配置
   */
  reload(): void {
    this.layers = [];
    this.merged = null;
    this.initializeLayers();
  }

  /**
   * 保存配置到文件
   */
  save(level: "user" | "project", config: Partial<FrameworkConfig>): void {
    const configPath = level === "user"
      ? path.join(process.env.HOME || process.env.USERPROFILE || "", ".mechanical-revolution", "config.json")
      : path.join(process.cwd(), ".mechanical-revolution", "config.json");

    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf-8");
    this.reload();
  }

  /**
   * 导出当前配置（用于调试）
   */
  export(): {
    layers: Array<{ name: string; priority: number; data: Partial<FrameworkConfig> }>;
    merged: FrameworkConfig;
  } {
    return {
      layers: this.layers.map(l => ({
        name: l.name,
        priority: l.priority,
        data: l.data,
      })),
      merged: this.getConfig(),
    };
  }
}

/**
 * 全局配置管理器实例
 */
export const globalConfigManager = new ConfigManager();
