import {readFileSync,mkdtempSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {describe,it,expect} from 'vitest';
import {replayRemainingServiceCoverage} from '../scripts/replay-remaining-service-coverage.mjs';
describe.skipIf(process.env.FOUNDRY_DOCKER_AUDIT!=='1')('additional service coverage in frozen Docker authority',()=>{
  it('accepts saved valid services and catches the missing metadata case',async()=>{
    const latest=JSON.parse(readFileSync('.local/remaining-pass-audit-2026-09-09/LATEST.json','utf8'));
    const cases=[
      ['variant-cache-repair',resolve('.local/final-six-2026-09-09/variant-cache-repair/trial-6/real-campaign-frozen/jobs/real-provider/records/variant-cache-repair-attempt-1/submission'),true],
      ['snapshot-recovery-repair',resolve('.local/final-six-2026-09-09/snapshot-recovery-repair/trial-7/real-campaign-frozen/jobs/real-provider/records/snapshot-recovery-repair-attempt-1/submission'),true],
      ['variant-cache-repair',join(latest.out,'variant-cache-repair/stale-304-metadata'),false],
    ] as const;
    for(const[id,submission,wanted]of cases){
      const result=await replayRemainingServiceCoverage({id,submission,output:mkdtempSync(join(tmpdir(),'foundry-service-coverage-'))});
      expect(result.pass).toBe(wanted);
      if(!wanted)expect(result.details.some(d=>!d.metadataCurrent&&d.originalStatus==='semantic-pass')).toBe(true);
    }
  },120000);
});
