// ─── Provider Display Names ───

export const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  anthropic: "claude",
  openai: "openai",
  doubao: "doubao",
  qwen: "qwen",
  deepseek: "deepseek",
  ollama: "ollama",
};

export function resolveProviderName(input: string, available: string[]): string | undefined {
  if (available.includes(input)) return input;
  for (const [configKey, displayName] of Object.entries(PROVIDER_DISPLAY_NAMES)) {
    if (displayName === input && available.includes(configKey)) return configKey;
  }
  const lower = input.toLowerCase();
  for (const key of available) {
    const display = PROVIDER_DISPLAY_NAMES[key] ?? key;
    if (display.toLowerCase() === lower || key.toLowerCase() === lower) return key;
  }
  return undefined;
}

export function getDisplayName(configKey: string): string {
  return PROVIDER_DISPLAY_NAMES[configKey] ?? configKey;
}
