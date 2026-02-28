import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import type { FrameworkConfig, ProviderConfig } from "../types.js";
import { isProviderConfig } from "../types.js";

/** Known non-provider top-level keys in the config JSON */
const RESERVED_KEYS = new Set([
  "autonomousMode",
  "defaultProvider",
  "mouseSpeed",
  "workspace",
  "mail",
  "memory",
  "notification",
  "tracing",
]);

/**
 * Load the framework config from a JSON file.
 *
 * The JSON file uses a flat structure (matching config.example.json):
 * provider configs sit at the top level alongside other settings.
 * This loader extracts them into a typed `providers` map.
 */
export function loadConfig(path?: string): FrameworkConfig {
  const configPath =
    path ?? resolve(process.cwd(), "config", "config.json");

  if (!existsSync(configPath)) {
    throw new Error(
      `Config file not found: ${configPath}\n` +
        `Copy config/config.example.json to config/config.json and fill in your keys.`
    );
  }

  const raw = readFileSync(configPath, "utf-8");
  const parsed = JSON.parse(raw);

  // Validate required fields
  if (!parsed.defaultProvider) {
    // defaultProvider is optional — agents specify their own provider
    // but we warn if it's missing
  }

  // Extract provider configs from flat structure
  const providers: Record<string, ProviderConfig> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (!RESERVED_KEYS.has(key) && isProviderConfig(value)) {
      providers[key] = value as ProviderConfig;
    }
  }

  if (Object.keys(providers).length === 0) {
    throw new Error(
      "No provider configs found in config. " +
        "Each provider needs at least apiKey, baseUrl, model, apiType, nativeToolCall, contextWindow."
    );
  }

  // Validate default provider if specified
  if (parsed.defaultProvider && !providers[parsed.defaultProvider]) {
    throw new Error(
      `Default provider "${parsed.defaultProvider}" not found in config. ` +
        `Available providers: ${Object.keys(providers).join(", ")}`
    );
  }

  const config: FrameworkConfig = {
    autonomousMode: parsed.autonomousMode ?? false,
    defaultProvider: parsed.defaultProvider,
    mouseSpeed: parsed.mouseSpeed,
    workspace: parsed.workspace,
    providers,
    mail: parsed.mail,
    memory: parsed.memory,
    notification: parsed.notification,
    tracing: parsed.tracing,
  };

  return config;
}

/**
 * Get all provider configs.
 */
export function getProviders(config: FrameworkConfig): Map<string, ProviderConfig> {
  return new Map(Object.entries(config.providers));
}

/**
 * Get a specific provider config by name.
 * Throws if the provider doesn't exist.
 */
export function getProviderConfig(
  config: FrameworkConfig,
  name: string
): ProviderConfig {
  const providerConfig = config.providers[name];
  if (!providerConfig) {
    throw new Error(
      `Provider "${name}" not found in config. ` +
        `Available providers: ${Object.keys(config.providers).join(", ")}`
    );
  }
  return providerConfig;
}
