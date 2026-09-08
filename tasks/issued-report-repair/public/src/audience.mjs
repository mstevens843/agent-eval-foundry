export function audience(report, requests, receipts, isNew) {
  return [...new Set(requests.filter((r) => r.report === report).map((r) => r.recipient))];
}
