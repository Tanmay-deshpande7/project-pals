const test = require('node:test'), assert = require('node:assert/strict');
const { createHttpHandler } = require('../functions/http');

function fixture(overrides = {}, identity = {}, dispatch = async uid => ({ uid })) {
    let called = false;
    const req = { method: 'POST', rawBody: Buffer.from('{}'), body: { uid: 'root' }, is: () => true, get: () => 'Bearer dummy-token', ...overrides };
    const res = { statusCode: 200, headers: {}, set(k, v) { this.headers[k] = v; }, status(s) { this.statusCode = s; return this; }, json(d) { this.body = d; } };
    const handler = createHttpHandler({ verifyIdToken: async (token, checkRevoked) => { assert.equal(token, 'dummy-token'); assert.equal(checkRevoked, true); return { uid: 'alice' }; }, ...identity }, { dispatch: async (...args) => { called = true; return dispatch(...args); } }, { error() {} });
    return { req, res, run: () => handler(req, res), called: () => called };
}
test('HTTP boundary refuses anonymous, non-JSON, oversized and non-POST requests before dispatch', async () => {
    for (const [overrides, status] of [[{ get: () => '' }, 401], [{ is: () => false }, 400], [{ rawBody: Buffer.alloc(1024 * 1024 + 1) }, 400], [{ method: 'GET' }, 405]]) {
        const f = fixture(overrides); await f.run(); assert.equal(f.res.statusCode, status); assert.equal(f.called(), false);
        assert.equal(f.res.headers['Cache-Control'], 'no-store');
    }
});
test('HTTP caller identity comes exclusively from a revocation-checked token', async () => {
    const f = fixture(); await f.run(); assert.equal(f.res.body.result.uid, 'alice');
});
test('invalid, wrong-project and revoked tokens cannot dispatch', async () => {
    for (const code of ['auth/argument-error', 'auth/id-token-revoked', 'auth/user-disabled']) {
        const f = fixture({}, { verifyIdToken: async () => { throw Object.assign(new Error('Private SDK detail'), { code }); } });
        await f.run(); assert.equal(f.res.statusCode, 401); assert.equal(f.called(), false); assert.doesNotMatch(JSON.stringify(f.res.body), /Private SDK/);
    }
});
test('backend failures hide storage details from clients', async () => {
    const f = fixture({}, {}, async () => { throw new Error('Sensitive database detail'); });
    await f.run(); assert.equal(f.res.statusCode, 503); assert.doesNotMatch(JSON.stringify(f.res.body), /Sensitive/);
});
