export const audience = (report, requests) => [
  ...new Set(requests.filter((r) => r.report === report).map((r) => r.recipient)),
];
