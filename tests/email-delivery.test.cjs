const test = require('node:test'), assert = require('node:assert/strict');
const { createEmailDelivery } = require('../functions/email-delivery');
function fixture() {
    const records = new Map(), calls = [], waits = [];
    const settings = { enabled: true, privateKey: 'test-private', publicKey: 'test-public',
        serviceId: 'test-service', templateId: 'test-template', dailyLimit: 50,
        monthlyLimit: 200, recipientHourlyLimit: 5 };
    const user = { email: 'trusted@example.test', emailVerified: true, disabled: false };
    let clock = Date.parse('2026-10-05T00:00:00Z'), sendError = false, response = { ok: true, status: 200 };
    let pending = Promise.resolve();
    const store = {
        set: async (_, p, d) => records.set(p, structuredClone(d)),
        transaction: (_, fn) => {
            const result = pending.then(async () => {
                const writes = []; let writing = false;
                const value = await fn({ get: async p => { assert.equal(writing, false); return records.get(p); },
                    set: (p, d) => { writing = true; writes.push([p, structuredClone(d)]); } });
                for (const [p, d] of writes) records.set(p, d);
                return value;
            }); pending = result.catch(() => {}); return result;
        }
    };
    const deliver = createEmailDelivery({ store, auth: { getUser: async () => user }, config: () => settings,
        now: () => clock, sleep: async ms => { waits.push(ms); clock += ms; },
        fetchImpl: async (url, options) => { calls.push({ url, ...options, body: JSON.parse(options.body) });
            if (sendError) throw new Error('network failed after possible acceptance'); return response; } });
    const event = (id = 'notice-1', extra = {}) => ({ uid: 'alice', noticeId: id,
        notification: { title: 'New application', body: 'Alice applied.', type: 'application_update', ...extra } });
    return { deliver, event, records, settings, user, calls, waits,
        advance: ms => clock += ms, fail: () => sendError = true, reject: () => response = { ok: false, status: 403 } };
}
test('disabled integration neither sends nor stores delivery records', async () => {
    const f = fixture(); f.settings.enabled = false; f.settings.privateKey = '';
    assert.equal((await f.deliver(f.event())).status, 'disabled'); assert.equal(f.calls.length, 0); assert.equal(f.records.size, 0);
});
test('recipient comes from Auth even if notification contains an arbitrary address', async () => {
    const f = fixture(); await f.deliver(f.event('notice-1', { to_email: 'attacker@example.test' }));
    assert.equal(f.calls[0].body.template_params.to_email, 'trusted@example.test');
    assert.equal(f.calls[0].body.accessToken, 'test-private');
    assert.equal(f.calls[0].url, 'https://api.emailjs.com/api/v1.0/email/send');
    assert.doesNotMatch(JSON.stringify([...f.records]), /test-private|trusted@example/);
});
test('unverified or disabled recipients and unknown notification types cannot send', async () => {
    for (const mutation of [f => f.user.emailVerified = false, f => f.user.disabled = true]) {
        const f = fixture(); mutation(f); await f.deliver(f.event()); assert.equal(f.calls.length, 0);
    }
    const f = fixture(); assert.equal((await f.deliver(f.event('x', { type: 'system' }))).status, 'invalid');
    assert.equal((await f.deliver({ ...f.event(), uid: '../evil' })).status, 'invalid'); assert.equal(f.calls.length, 0);
});
test('concurrent duplicate events send once and never retry an ambiguous timeout', async () => {
    const f = fixture(); await Promise.all([f.deliver(f.event()), f.deliver(f.event())]); assert.equal(f.calls.length, 1);
    const g = fixture(); g.fail(); assert.equal((await g.deliver(g.event())).status, 'uncertain');
    assert.equal((await g.deliver(g.event())).status, 'duplicate'); assert.equal(g.calls.length, 1);
});
test('provider rejections are recorded and cannot loop on event retries', async () => {
    const f = fixture(); f.reject(); assert.equal((await f.deliver(f.event())).status, 'rejected');
    await f.deliver(f.event()); assert.equal(f.calls.length, 1);
});
test('per-recipient and global daily caps suppress excess email without throwing', async () => {
    for (const field of ['recipientHourlyLimit', 'dailyLimit']) {
        const f = fixture(); f.settings[field] = 1; await f.deliver(f.event());
        assert.equal((await f.deliver(f.event('notice-2'))).status, 'suppressed'); assert.equal(f.calls.length, 1);
    }
});
test('monthly cap remains across day rollover and resets next month', async () => {
    const f = fixture(); f.settings.monthlyLimit = 1; await f.deliver(f.event()); f.advance(86400000);
    assert.equal((await f.deliver(f.event('notice-2'))).status, 'suppressed');
    f.advance(31 * 86400000); assert.equal((await f.deliver(f.event('notice-3'))).status, 'sent');
});
test('distinct notifications are spaced beyond the provider one-request-per-second limit', async () => {
    const f = fixture(); await f.deliver(f.event()); await f.deliver(f.event('notice-2'));
    assert.deepEqual(f.waits, [1100]); assert.equal(f.calls.length, 2);
});
test('enabled delivery fails closed without credentials or with unsafe limits', async () => {
    const f = fixture(); f.settings.privateKey = ''; await assert.rejects(f.deliver(f.event()), /incomplete/);
    const g = fixture(); g.settings.dailyLimit = 0; await assert.rejects(g.deliver(g.event()), /limits/);
    assert.equal(f.calls.length + g.calls.length, 0);
});
