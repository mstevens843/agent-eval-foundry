export async function publish(api, id, ticket) {
  const result = await api.publish({ id, data: Buffer.from(JSON.stringify(ticket)).toString("base64") });
  if (result.error) throw Error("publication: " + result.error);
}
