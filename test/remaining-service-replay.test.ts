import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { replayRemainingServiceCoverage } from "../scripts/replay-remaining-service-coverage.mjs";
describe("published additional service coverage", () => {
  it("covers every replacement with all pinned scenarios and passing service replays", () => {
    const read = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8"));
    const audit = read<{ generated: Array<{ id: string; name: string }> }>(
      "reports/screening/evidence/2026-09-09-remaining-pass-audit.json",
    );
    const campaign = read<{
      packages: Array<{
        id: string;
        attempts: Array<{
          packageDigest: string;
          serviceSupplement: {
            packageDigest: string;
            gradingRevision: string;
            pass: boolean;
            details: Array<{
              scenario: string;
              originalStatus: string;
              metadataCurrent: boolean;
              pass: boolean;
            }>;
          };
        }>;
      }>;
    }>("reports/screening/evidence/2026-09-09-three-replacements.json");
    for (const pkg of campaign.packages) {
      const scenarios = audit.generated.filter((c) => c.id === pkg.id).map((c) => c.name);
      expect(scenarios.length).toBeGreaterThan(0);
      for (const attempt of pkg.attempts) {
        const replay = attempt.serviceSupplement;
        expect(replay.packageDigest).toBe(attempt.packageDigest);
        expect(replay.gradingRevision).toBe("remaining-pass-coverage-v3");
        expect(replay.details.map((d) => d.scenario)).toEqual(scenarios);
        expect(
          replay.details.every((d) => d.pass && d.metadataCurrent && d.originalStatus === "semantic-pass"),
        ).toBe(true);
        expect(replay.pass).toBe(true);
      }
    }
  });
});
// Retained solver archives are deliberately private. The portable assertions above
// always run in CI; opt in explicitly to the additional real Docker reproduction.
if (process.env.FOUNDRY_DOCKER_AUDIT === "1")
  describe("additional service coverage in frozen Docker authority", () => {
    it("accepts saved valid services and catches the missing metadata case", async () => {
      const latest = JSON.parse(readFileSync(".local/remaining-pass-audit-2026-09-09/LATEST.json", "utf8"));
      const cases = [
        [
          "variant-cache-repair",
          resolve(
            ".local/final-six-2026-09-09/variant-cache-repair/trial-6/real-campaign-frozen/jobs/real-provider/records/variant-cache-repair-attempt-1/submission",
          ),
          true,
        ],
        [
          "snapshot-recovery-repair",
          resolve(
            ".local/final-six-2026-09-09/snapshot-recovery-repair/trial-7/real-campaign-frozen/jobs/real-provider/records/snapshot-recovery-repair-attempt-1/submission",
          ),
          true,
        ],
        ["variant-cache-repair", join(latest.out, "variant-cache-repair/stale-304-metadata"), false],
      ] as const;
      for (const [id, submission, wanted] of cases) {
        const result = await replayRemainingServiceCoverage({
          id,
          submission,
          output: mkdtempSync(join(tmpdir(), "foundry-service-coverage-")),
        });
        expect(result.pass).toBe(wanted);
        if (!wanted)
          expect(result.details.some((d) => !d.metadataCurrent && d.originalStatus === "semantic-pass")).toBe(
            true,
          );
      }
    }, 120000);
  });
