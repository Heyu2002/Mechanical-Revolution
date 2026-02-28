/**
 * Raw input prompt with inline autocomplete menu.
 * Bypasses readline entirely — reads raw keypresses from stdin,
 * renders prompt + menu in a single atomic stdout.write().
 * Works reliably on Windows Terminal, PowerShell, and all modern terminals.
 */

import stringWidth from "string-width";

export interface CommandItem {
  name: string;
  description: string;
  hasArgs?: boolean;  // true = needs arguments, Enter fills input instead of submitting
}

const C = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  bold: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  bgCyan: "\x1b[46m\x1b[30m",
};

export type PromptResult =
  | { type: "input"; value: string }
  | { type: "eof" };

export class InteractivePrompt {
  private input = "";
  private cursorPos = 0;
  private menuIndex = 0;
  private renderedLines = 0; // total lines rendered last frame (status + prompt + menu)
  private commands: CommandItem[] = [];
  private history: string[] = [];
  private historyIndex = -1;
  private tempInput = ""; // saves current input when browsing history
  private currentAgent = ""; // current agent name

  private resolveInput: ((result: PromptResult) => void) | null = null;

  constructor(commands: CommandItem[]) {
    this.commands = commands;
  }

  /** Set current agent name */
  setCurrentAgent(agentName: string): void {
    this.currentAgent = agentName;
  }

  /** Get current agent name */
  getCurrentAgent(): string {
    return this.currentAgent;
  }

  /** Ask for one line of input. Returns a promise that resolves when Enter is pressed. */
  ask(): Promise<PromptResult> {
    this.input = "";
    this.cursorPos = 0;
    this.menuIndex = 0;
    this.historyIndex = -1;

    // Non-TTY fallback (piped input): use simple line reading
    if (!process.stdin.isTTY) {
      return this.askSimple();
    }

    return new Promise<PromptResult>((resolve) => {
      this.resolveInput = resolve;

      if (!process.stdin.isRaw) {
        process.stdin.setRawMode(true);
      }
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      this.render();

      const onData = (data: string) => {
        const shouldContinue = this.handleKey(data);
        if (!shouldContinue) {
          process.stdin.removeListener("data", onData);
          process.stdin.pause();
        }
      };

      process.stdin.on("data", onData);
    });
  }

  /** Simple line-based input for non-TTY (piped) mode */
  private askSimple(): Promise<PromptResult> {
    return new Promise<PromptResult>((resolve) => {
      process.stdout.write(`${C.green}you >${C.reset} `);
      process.stdin.resume();
      process.stdin.setEncoding("utf8");

      const onData = (data: string) => {
        process.stdin.removeListener("data", onData);
        process.stdin.pause();
        const line = data.toString().trim();
        if (!line) {
          resolve({ type: "eof" });
        } else {
          resolve({ type: "input", value: line });
        }
      };

      process.stdin.on("data", onData);
    });
  }

  /** Cleanup: restore terminal state */
  destroy(): void {
    if (process.stdin.isRaw) {
      process.stdin.setRawMode(false);
    }
  }

  private getFiltered(): CommandItem[] {
    if (!this.input.startsWith("/")) return [];
    const q = this.input.slice(1).toLowerCase();
    return this.commands.filter(
      (c) =>
        c.name.toLowerCase().includes("/" + q) ||
        c.description.toLowerCase().includes(q)
    );
  }

  /** Handle a raw keypress. Returns false if input is complete. */
  private handleKey(data: string): boolean {
    const filtered = this.getFiltered();
    const menuVisible = filtered.length > 0;

    // Ctrl+C
    if (data === "\x03") {
      this.clearFrame();
      process.stdout.write("\n");
      process.exit(0);
      return false;
    }

    // Ctrl+D (EOF)
    if (data === "\x04") {
      this.clearFrame();
      process.stdout.write("\n");
      this.resolveInput?.({ type: "eof" });
      this.resolveInput = null;
      return false;
    }

    // Enter
    if (data === "\r" || data === "\n") {
      // If menu is visible, use selected command
      if (menuVisible) {
        const selected = filtered[this.menuIndex];
        if (selected) {
          // Command needs arguments → fill into input, don't submit
          if (selected.hasArgs) {
            this.input = selected.name + " ";
            this.cursorPos = this.input.length;
            this.menuIndex = 0;
            this.render();
            return true;
          }
          // No args needed → submit directly
          this.input = selected.name;
        }
      }
      this.clearFrame();
      // Print the final prompt line
      process.stdout.write(`${C.green}you >${C.reset} ${this.input}\n`);
      const value = this.input.trim();
      if (value) {
        this.history.push(value);
      }
      this.resolveInput?.({ type: "input", value });
      this.resolveInput = null;
      return false;
    }

    // Escape
    if (data === "\x1b" || data === "\x1b\x1b") {
      // Just clear menu by resetting input if only "/"
      if (this.input === "/") {
        this.input = "";
        this.cursorPos = 0;
      }
      this.menuIndex = 0;
      this.render();
      return true;
    }

    // Arrow up
    if (data === "\x1b[A") {
      if (menuVisible) {
        this.menuIndex = this.menuIndex <= 0 ? filtered.length - 1 : this.menuIndex - 1;
      } else {
        // History navigation
        if (this.history.length > 0) {
          if (this.historyIndex === -1) {
            this.tempInput = this.input;
            this.historyIndex = this.history.length - 1;
          } else if (this.historyIndex > 0) {
            this.historyIndex--;
          }
          this.input = this.history[this.historyIndex];
          this.cursorPos = this.input.length;
        }
      }
      this.render();
      return true;
    }

    // Arrow down
    if (data === "\x1b[B") {
      if (menuVisible) {
        this.menuIndex = this.menuIndex >= filtered.length - 1 ? 0 : this.menuIndex + 1;
      } else {
        // History navigation
        if (this.historyIndex !== -1) {
          if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.input = this.history[this.historyIndex];
          } else {
            this.historyIndex = -1;
            this.input = this.tempInput;
          }
          this.cursorPos = this.input.length;
        }
      }
      this.render();
      return true;
    }

    // Arrow right
    if (data === "\x1b[C") {
      this.cursorPos = Math.min(this.cursorPos + 1, this.input.length);
      this.render();
      return true;
    }

    // Arrow left
    if (data === "\x1b[D") {
      this.cursorPos = Math.max(0, this.cursorPos - 1);
      this.render();
      return true;
    }

    // Home
    if (data === "\x1b[H" || data === "\x01") {
      this.cursorPos = 0;
      this.render();
      return true;
    }

    // End
    if (data === "\x1b[F" || data === "\x05") {
      this.cursorPos = this.input.length;
      this.render();
      return true;
    }

    // Tab — autocomplete selected menu item
    if (data === "\t") {
      if (menuVisible) {
        const selected = filtered[this.menuIndex];
        if (selected) {
          this.input = selected.name;
          this.cursorPos = this.input.length;
          this.menuIndex = 0;
        }
      }
      this.render();
      return true;
    }

    // Backspace
    if (data === "\x7f" || data === "\b") {
      if (this.cursorPos > 0) {
        this.input =
          this.input.slice(0, this.cursorPos - 1) +
          this.input.slice(this.cursorPos);
        this.cursorPos--;
        this.menuIndex = 0;
      }
      this.render();
      return true;
    }

    // Delete
    if (data === "\x1b[3~") {
      if (this.cursorPos < this.input.length) {
        this.input =
          this.input.slice(0, this.cursorPos) +
          this.input.slice(this.cursorPos + 1);
        this.menuIndex = 0;
      }
      this.render();
      return true;
    }

    // Ctrl+U — clear line
    if (data === "\x15") {
      this.input = "";
      this.cursorPos = 0;
      this.menuIndex = 0;
      this.render();
      return true;
    }

    // Ctrl+W — delete word backward
    if (data === "\x17") {
      const before = this.input.slice(0, this.cursorPos);
      const trimmed = before.trimEnd();
      const lastSpace = trimmed.lastIndexOf(" ");
      const newPos = lastSpace === -1 ? 0 : lastSpace + 1;
      this.input = this.input.slice(0, newPos) + this.input.slice(this.cursorPos);
      this.cursorPos = newPos;
      this.menuIndex = 0;
      this.render();
      return true;
    }

    // Printable characters
    const code = data.charCodeAt(0);
    if (code >= 32) {
      this.input =
        this.input.slice(0, this.cursorPos) +
        data +
        this.input.slice(this.cursorPos);
      this.cursorPos += data.length;
      this.menuIndex = 0;
      this.historyIndex = -1;
      this.render();
      return true;
    }

    return true;
  }

  /** Render prompt + menu as a single atomic write */
  private render(): void {
    const filtered = this.getFiltered();
    const menuVisible = filtered.length > 0;

    // Step 1: Erase previous frame
    this.clearFrame();

    // Step 2: Build entire output
    let output = "";
    let totalLines = 0;

    // Show current agent status line (if set)
    if (this.currentAgent) {
      output += `${C.dim}current agent: ${C.cyan}${this.currentAgent}${C.reset}\n`;
      totalLines++;
    }

    // Prompt line
    const promptLine = `${C.green}you >${C.reset} ${this.input}`;
    output += promptLine;

    // Menu
    if (menuVisible) {
      const maxName = Math.max(...filtered.map((c) => c.name.length));
      for (let i = 0; i < filtered.length; i++) {
        const item = filtered[i];
        const padded = item.name.padEnd(maxName + 2);
        const isSelected = i === this.menuIndex;
        output += "\n";
        if (isSelected) {
          output += `${C.bgCyan} ${padded} ${item.description} ${C.reset}`;
        } else {
          output += `  ${C.cyan}${padded}${C.reset} ${C.dim}${item.description}${C.reset}`;
        }
        totalLines++;
      }
    }

    // Step 3: Single atomic write
    process.stdout.write(output);

    // Step 4: Move cursor back to input position
    if (totalLines > 0) {
      process.stdout.write(`\x1b[${totalLines}A`); // move up past menu (and status if present)
    }

    // If we have a status line, move down one line to the prompt
    if (this.currentAgent) {
      process.stdout.write(`\x1b[1B`); // move down 1 line
    }

    // Position cursor: "you > " is 6 chars + display width of input up to cursorPos
    const inputBeforeCursor = this.input.slice(0, this.cursorPos);
    const displayWidth = stringWidth(inputBeforeCursor);
    process.stdout.write(`\r\x1b[${6 + displayWidth}C`);

    this.renderedLines = totalLines;
  }

  /** Erase the previous frame (status line + prompt line + menu lines) */
  private clearFrame(): void {
    // If we have a status line, move up one more line
    if (this.currentAgent && this.renderedLines > 0) {
      process.stdout.write(`\x1b[1A`); // move up to status line
    }
    // Move to start of line
    process.stdout.write("\r");
    // Clear from cursor to end of screen (clears status + prompt + all menu lines below)
    process.stdout.write("\x1b[0J");
    this.renderedLines = 0;
  }
}
