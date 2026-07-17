import * as readline from "node:readline/promises";
import { stdin, stdout } from "node:process";

export async function ask(question: string, fallback?: string): Promise<string> {
  const rl = readline.createInterface({ input: stdin, output: stdout });
  try {
    const suffix = fallback ? ` (${fallback}): ` : ": ";
    const answer = await rl.question(question + suffix);
    return answer.trim() || fallback || "";
  } finally {
    rl.close();
  }
}
