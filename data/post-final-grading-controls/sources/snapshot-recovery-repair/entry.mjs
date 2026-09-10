import { subject as reference } from './reference-entry.mjs';

// Invalid implementation: corrupt an exact account-name string in BOTH the
// database and portable backup. Numeric equality cannot justify renaming it.
const corrupt = (row) => ({ ...row, name: row.name === '001' ? '1' : row.name });
export const subject = {
  async run(view, api) {
    return reference.run(view, {
      ...api,
      put(request) {
        return api.put(request.table === 'accounts'
          ? { ...request, row: corrupt(request.row) } : request);
      },
      archive(request) {
        const backup = JSON.parse(Buffer.from(request.bytes, 'base64'));
        backup.accounts = backup.accounts.map(corrupt);
        return api.archive({ bytes: Buffer.from(JSON.stringify(backup)).toString('base64') });
      },
    });
  },
};
