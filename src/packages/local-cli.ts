import { nativePackageCommand } from "./native-caa.js";
import { portfolioCommand } from "./portfolio.js";

async function main() {
  try {
    const args = process.argv.slice(2);
    const result =
      args[0] === "portfolio"
        ? await portfolioCommand(process.cwd(), args.slice(1))
        : await nativePackageCommand(process.cwd(), args);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  }
}
void main();
