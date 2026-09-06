import { nativePackageCommand } from "./native-caa.js";

async function main() {
  try {
    const result = await nativePackageCommand(process.cwd(), process.argv.slice(2));
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    process.stderr.write(`${String(error)}\n`);
    process.exitCode = 1;
  }
}
void main();
