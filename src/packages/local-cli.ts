#!/usr/bin/env node
import { developerCommand, explainError } from "./developer-command.js";

async function main() {
  try {
    const args = process.argv.slice(2);
    const result = await developerCommand(process.cwd(), args);
    process.stdout.write(`${typeof result === "string" ? result : JSON.stringify(result, null, 2)}\n`);
    if (
      args[0] === "doctor" &&
      typeof result === "object" &&
      result !== null &&
      "ok" in result &&
      result.ok === false
    )
      process.exitCode = 1;
  } catch (error) {
    process.stderr.write(explainError(error));
    process.exitCode = 1;
  }
}
void main();
