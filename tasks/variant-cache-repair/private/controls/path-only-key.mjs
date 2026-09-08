export function matches(entry, event) {
  return entry.path === event.path;
}
export function fresh(entry, event) {
  return !entry.noStore && entry.age + event.now - entry.storedAt < entry.maxAge;
}
export function merge(old, response, event) {
  return {
    path: event.path,
    headers: event.headers,
    vary: response.vary,
    etag: response.etag,
    body: response.status === 304 ? old.body : response.body,
    maxAge: response.maxAge,
    age: response.age,
    storedAt: event.now,
    noStore: response.noStore,
  };
}
