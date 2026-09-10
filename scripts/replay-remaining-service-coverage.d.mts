export function replayRemainingServiceCoverage(args: {id:string;submission:string;output:string}): Promise<{
  id:string;
  gradingRevision:string;
  pass:boolean;
  details:Array<{scenario:string;originalStatus:string;metadataCurrent:boolean;pass:boolean}>;
}>;
