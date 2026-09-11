import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { startAuthoringDiagnostics } from "../src/execution/authoring-diagnostics.js";
import { type CaptureResult, captureProcess } from "../src/execution/capture.js";
import { localProcess } from "../src/packages/local-process.js";

describe("offline Browser authoring runtime", () => {
  it("runs Chromium with large image events and preserves diagnostics for an aborted CLI process", async () => {
    // CI builds this pinned browser runtime; it does not have the private
    // provider-agent image used by the historical campaign. No model is run.
    const inspectedImage = await localProcess("docker", [
      "image",
      "inspect",
      "--format",
      "{{.Id}}",
      "foundry-portfolio-runtime:v1",
    ]);
    const image = inspectedImage.stdout.trim();
    expect(image).toMatch(/^sha256:[a-f0-9]{64}$/);
    const root = resolve(".local/browser-runtime-reliability-2026-09-11", `offline-${Date.now()}`);
    mkdirSync(root, { recursive: true });
    for (const abort of [false, true]) {
      const directory = join(root, abort ? "abort" : "browser");
      mkdirSync(directory);
      const name = `foundry-offline-browser-${process.pid}-${abort ? "abort" : "work"}`;
      const source = abort
        ? `console.log(JSON.stringify({type:'system',fixture:true}));setTimeout(()=>process.abort(),2500)`
        : `const {chromium}=require('playwright');
          (async()=>{
            const memory=Buffer.alloc(2304*1024*1024,1);
            const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
            const page=await browser.newPage({viewport:{width:800,height:600}});
            await page.setContent('<button>Complete</button><canvas width="800" height="550"></canvas>');
            await page.evaluate(()=>{const c=document.querySelector('canvas'),x=c.getContext('2d'),p=x.createImageData(800,550);let n=42;for(let i=0;i<p.data.length;i+=4){n=(n*1664525+1013904223)>>>0;p.data[i]=n&255;p.data[i+1]=(n>>>8)&255;p.data[i+2]=(n>>>16)&255;p.data[i+3]=255;}x.putImageData(p,0,0);});
            for(let i=0;i<4;i++){
              await page.getByRole('button',{name:'Complete'}).click();
              const data=(await page.screenshot()).toString('base64');
              console.log(JSON.stringify({type:'tool_result',data}));
            }
            await new Promise(r=>setTimeout(r,2500));
            console.log(JSON.stringify({type:'result',success:true,touched:memory[0]}));
            await browser.close();
          })().catch(e=>{console.error(e);process.exitCode=1;});`;
      const monitor = startAuthoringDiagnostics(name, join(directory, "resources.jsonl"), {
        intervalMs: 500,
      });
      let runtime: { state: { ExitCode: number; OOMKilled: boolean } } | undefined;
      let result: CaptureResult;
      try {
        result = await captureProcess(
          "docker",
          [
            "run",
            "--pull=never",
            "--name",
            name,
            "--init",
            "--read-only",
            "--network=none",
            "--cpus=2",
            "--memory=4096m",
            "--pids-limit=256",
            "--user=1000:1000",
            "--cap-drop=ALL",
            "--security-opt=no-new-privileges",
            "--ulimit=core=0",
            "--tmpfs",
            "/tmp:rw,exec,size=512m,mode=1777",
            "--tmpfs",
            "/home/provider:rw,exec,size=256m,mode=1777",
            "--env",
            "HOME=/home/provider",
            image,
            "node",
            "-e",
            source,
          ],
          {
            directory: join(directory, "capture"),
            timeoutMs: 120000,
            maxBytes: 32 * 1024 * 1024,
            env: { PATH: process.env.PATH ?? "", HOME: process.env.HOME ?? "" },
            jsonEvents: true,
            cleanup: async () => {
              const diagnostics = await monitor.stop();
              const inspected = await localProcess("docker", [
                "inspect",
                "--format",
                '{"state":{{json .State}}}',
                name,
              ]);
              runtime = JSON.parse(inspected.stdout);
              writeFileSync(
                join(directory, "runtime.json"),
                JSON.stringify({ ...runtime, diagnostics }, null, 2),
              );
            },
          },
        );
      } finally {
        await monitor.stop();
        await localProcess("docker", ["rm", "-f", name]);
      }
      writeFileSync(join(directory, "capture.json"), JSON.stringify(result, null, 2));
      expect(runtime?.state.OOMKilled).toBe(false);
      expect(result.truncated).toBe(false);
      expect(result.status).toBe(abort ? "process-error" : "completed");
      expect(result.exitCode).toBe(abort ? 134 : 0);
      if (!abort) {
        expect(result.bytesSeen).toBeGreaterThan(4 * 1024 * 1024);
        expect(result.eventCount).toBe(5);
      }
      const resources = readFileSync(join(directory, "resources.jsonl"), "utf8");
      expect(resources).toContain("memory.peak");
      expect(resources).toContain("memory.events");
      expect(resources).toContain("4294967296");
      if (!abort) {
        const samples: { resourceText: string | null }[] = resources
          .trim()
          .split("\n")
          .map((line) => JSON.parse(line));
        const peaks = samples.map((sample) =>
          Number(/memory\.peak\n(\d+)/.exec(sample.resourceText ?? "")?.[1] ?? 0),
        );
        expect(Math.max(...peaks)).toBeGreaterThan(2048 * 1024 * 1024);
      }
    }
    writeFileSync(
      join(root, "result.json"),
      JSON.stringify({ pass: true, providerCallsMade: 0, browserMemoryMiB: 4096 }),
    );
  }, 300000);
});
