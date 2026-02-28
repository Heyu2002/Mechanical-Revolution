import type { CommandItem } from "../autocomplete.js";

export const SLASH_COMMANDS: CommandItem[] = [
  { name: "/help",     description: "Show detailed help" },
  { name: "/provider", description: "Switch LLM provider", hasArgs: true },
  { name: "/agents",   description: "List registered agents" },
  { name: "/agent",    description: "Switch active agent", hasArgs: true },
  { name: "/clear",    description: "Clear conversation history" },
  { name: "/verbose",  description: "Toggle verbose mode" },
  { name: "/skills",   description: "List all available skills" },
  { name: "/skill",    description: "Show skill details", hasArgs: true },
  { name: "/quit",     description: "Exit" },
];
