const test = require('node:test'), assert = require('node:assert/strict');
const { createGateway } = require('../functions/gateway');
const P = require('../functions/policy'), W = require('../functions/wire');
const { createSecureDataClient } = require('../shared/secure-data-client');
const at = new Date('2026-10-05T00:00:00Z');
function fixture() {
    const maps = Object.fromEntries(Object.keys(P.STORES).map(k => [k, new Map()]));
    const clone = structuredClone;
    const store = {
        get: async (k, p) => clone(maps[k].get(p) || null),
        set: async (k, p, d) => { maps[k].set(p, clone(d)); },
        query: async (k, p, q) => {
            let rows = [...maps[k]].filter(([s]) => s.startsWith(p + '/') && s.split('/').length === p.split('/').length + 1).map(([s, data]) => ({ id: s.split('/').at(-1), data: clone(data) }));
            for (const [field, op, v] of q.filters || []) rows = rows.filter(r => { const x = field === '__name__' ? r.id : r.data[field]; return op === '==' ? x === v : op === 'in' ? v.includes(x) : Array.isArray(x) && x.includes(v); });
            if (q.order) rows.sort((a, b) => (a.data[q.order[0]] > b.data[q.order[0]] ? 1 : -1) * (q.order[1] === 'desc' ? -1 : 1));
            return rows.slice(0, q.limit || 200);
        },
        deleteMany: async (k, paths) => paths.forEach(p => maps[k].delete(p)),
        transaction: async (k, fn) => {
            let writing = false; const queued = [];
            const result = await fn({ get: p => { assert.equal(writing, false, 'SDK transaction read after write'); return store.get(k, p); }, query: (p, q) => { assert.equal(writing, false); return store.query(k, p, q); }, set: (p, d) => { writing = true; queued.push([p, d]); }, delete: p => { writing = true; queued.push([p, null]); } });
            queued.forEach(([p, d]) => d === null ? maps[k].delete(p) : maps[k].set(p, clone(d))); return result;
        }
    };
    const people = { alice: { uid: 'alice', email: 'alice@example.test', emailVerified: true, displayName: 'Alice' }, bob: { uid: 'bob', email: 'bob@example.test', emailVerified: true, displayName: 'Bob' }, eve: { uid: 'eve', email: 'eve@example.test', emailVerified: true, displayName: 'Eve' }, root: { uid: 'root', email: 'root@example.test', emailVerified: true, displayName: 'Root' } };
    const auth = { getUser: async id => { assert.ok(people[id]); return people[id]; }, getUserByEmail: async email => Object.values(people).find(u => u.email === email), updateUser: async (id, data) => Object.assign(people[id], data), revokeRefreshTokens: async id => { people[id].revoked = true; } };
    let serial = 0; const gateway = createGateway({ store, auth, now: () => at, chooseShard: () => 'shard-1', newId: () => `notice-${++serial}` });
    for (const u of Object.values(people)) maps.master.set(`users/${u.uid}`, { displayName: u.displayName, email: u.email, networkId: u.uid.slice(0, 8).toUpperCase(), createdAt: at, connections: [], shardId: 'shard-1' });
    maps.master.set('admins/root', { email: people.root.email, role: 'root' });
    maps['shard-1'].set('projects/p', { title: 'Dummy project', description: '', authorId: 'alice', authorName: 'Alice', participants: ['bob'], roles: [{ title: 'Engineer', description: '', assigneeId: null }], createdAt: at, status: 'active' });
    maps['shard-1'].set('threads/team_p', { projectId: 'p', chatId: 'team_p', participants: ['alice', 'bob'] });
    const call = (uid, input) => gateway.dispatch(uid, input);
    const write = (uid, path, data, method = 'update', storeKey = 'shard-1', merge = false) => call(uid, { kind: 'write', operations: [{ store: storeKey, path, data: W.encode(data), method, merge }] });
    return { maps, people, call, write, store, gateway };
}
const read = (path, more = {}) => ({ kind: 'read', store: 'shard-1', path, ...more });
const denied = action => assert.rejects(action, err => err instanceof P.PolicyError && [400, 401, 403, 409, 429].includes(err.status));

test('ordinary users cannot create/edit any admin or organizer registry entry', async () => {
    const f = fixture();
    for (const path of ['admins/eve', 'admins/root', 'organizers/eve']) await denied(f.write('eve', path, { email: 'eve@example.test', role: 'root' }, 'set'));
    await denied(f.call('eve', { kind: 'manageAdmin', operation: 'grant', email: 'eve@example.test' }));
    assert.equal(f.maps.master.get('admins/root').role, 'root');
});
test('admin listings are private; unverified or email-only invitations grant no authority', async () => {
    const f = fixture(); await denied(f.call('eve', read('admins')));
    f.maps.master.set('admins/eve@example.test', { email: 'eve@example.test', role: 'root' });
    assert.equal((await f.gateway.context('eve')).role, null);
    f.maps.master.set('admins/eve', { email: 'eve@example.test', role: 'root' }); f.people.eve.emailVerified = false;
    assert.equal((await f.gateway.context('eve')).role, null); await denied(f.call('root', { kind: 'manageAdmin', operation: 'grant', email: 'eve@example.test' }));
});
test('verified existing account grant is UID-based and revocation applies on the next request', async () => {
    const f = fixture(); await f.call('root', { kind: 'manageAdmin', operation: 'grant', email: 'eve@example.test' });
    assert.equal((await f.gateway.context('eve')).role, 'admin');
    await f.call('root', { kind: 'manageAdmin', operation: 'revoke', uid: 'eve' });
    await denied(f.call('eve', read('admins'))); await denied(f.call('root', { kind: 'manageAdmin', operation: 'revoke', uid: 'root' }));
});
test('profiles expose discovery fields but redact another users email and connections', async () => {
    const f = fixture(), other = await f.call('eve', read('users/alice'));
    assert.equal(other.data.displayName, 'Alice'); assert.equal(other.data.email, undefined); assert.equal(other.data.connections, undefined);
    assert.equal((await f.call('alice', read('users/alice'))).data.email, 'alice@example.test');
    await denied(f.call('eve', read('users')));
    const found = await f.call('eve', read('users', { filters: [['networkId', '==', 'ALICE']] })); assert.equal(found.docs.length, 1); assert.equal(found.docs[0].data.email, undefined);
});
test('user cannot change someone elses profile, shard, email identity or connections', async () => {
    const f = fixture();
    for (const [path, data] of [['users/alice', { displayName: 'Impersonated' }], ['users/eve', { shardId: 'master' }], ['users/eve', { connections: ['alice'] }], ['users/eve', { email: 'alice@example.test' }]]) await denied(f.write('eve', path, data));
    await f.write('eve', 'users/eve', { displayName: 'Changed' }); assert.equal(f.maps.master.get('users/eve').displayName, 'Changed');
});
test('project author can edit content; outsiders cannot alter or transfer ownership', async () => {
    const f = fixture(); await f.write('alice', 'projects/p', { title: 'Updated' });
    await denied(f.write('eve', 'projects/p', { title: 'Hijacked' })); await denied(f.write('alice', 'projects/p', { authorId: 'eve' }));
    await denied(f.write('eve', 'projects/p', null, 'delete')); assert.ok(f.maps['shard-1'].has('projects/p'));
});
test('chat read/send is bound to current membership and sender identity', async () => {
    const f = fixture(); const message = { chatId: 'team_p', text: 'Hello', senderId: 'bob', senderName: 'Forged name', createdAt: at };
    await denied(f.write('eve', 'messages/m', { ...message, senderId: 'eve' }, 'set'));
    await denied(f.write('bob', 'messages/m', { ...message, senderId: 'alice' }, 'set'));
    await f.write('bob', 'messages/m', message, 'set'); assert.equal(f.maps['shard-1'].get('messages/m').senderName, 'Bob');
    assert.equal((await f.call('bob', read('messages', { filters: [['chatId', '==', 'team_p']] }))).docs.length, 1);
    await denied(f.call('eve', read('messages', { filters: [['chatId', '==', 'team_p']] }))); await denied(f.call('eve', read('messages')));
    await denied(f.write('bob', 'messages/m', { text: 'Rewritten' }));
});
test('first team message creates its authorized thread; counters are server managed', async () => {
    const f = fixture(); f.maps['shard-1'].delete('threads/team_p');
    await f.write('bob', 'messages/m', { chatId: 'team_p', text: 'First', senderId: 'bob', senderName: 'Bob' }, 'set');
    assert.deepEqual(f.maps['shard-1'].get('threads/team_p').participants, ['alice', 'bob']);
    await denied(f.write('bob', 'threads/team_p', { participants: ['bob', 'eve'] }));
    await f.write('bob', 'threads/team_p', { unreadCount_bob: 0 }, 'set', 'shard-1', true);
});
test('removed member loses access even when old thread data remains', async () => {
    const f = fixture(); await f.write('alice', 'projects/p', { participants: [], roles: [{ title: 'Engineer', assigneeId: null }] });
    f.maps['shard-1'].get('threads/team_p').participants.push('bob'); // Stale derived copy cannot authorize.
    await denied(f.call('bob', read('threads/team_p')));
    await denied(f.call('bob', read('messages', { filters: [['chatId', '==', 'team_p']] })));
});
test('applicant cannot self-hire; owner hiring commits application and team membership', async () => {
    const f = fixture(); const a = { projectId: 'p', applicantId: 'eve', applicantName: 'Eve', role: 'Engineer', message: '', skills: '', status: 'pending' };
    await f.write('eve', 'applications/a', a, 'set'); await denied(f.write('eve', 'applications/a', { status: 'hired' }));
    await denied(f.call('bob', read('applications/a')));
    await f.write('alice', 'applications/a', { status: 'hired', updatedAt: at });
    assert.ok(f.maps['shard-1'].get('projects/p').participants.includes('eve')); assert.ok(f.maps['shard-1'].get('threads/team_p').participants.includes('eve'));
});
test('only intended recipient accepts a connection; reciprocal profiles update atomically', async () => {
    const f = fixture(); const req = { type: 'crew_request', senderId: 'alice', senderName: 'Alice', receiverId: 'bob', status: 'pending' };
    await f.write('alice', 'requests/r', req, 'set'); await denied(f.write('eve', 'requests/r', { status: 'accepted' }));
    await denied(f.write('bob', 'requests/r', { status: 'accepted', senderId: 'eve' }));
    await f.write('bob', 'requests/r', { status: 'accepted' }); await f.write('bob', 'requests/r', { status: 'accepted' });
    assert.deepEqual(f.maps.master.get('users/alice').connections, ['bob']); assert.deepEqual(f.maps.master.get('users/bob').connections, ['alice']);
});
test('project invitations require the author and acceptance binds the recipient', async () => {
    const f = fixture(); const req = { type: 'project_invite', senderId: 'alice', senderName: 'Alice', receiverId: 'eve', projectId: 'p', projectTitle: 'Dummy project', status: 'pending' };
    await denied(f.write('bob', 'requests/i', { ...req, senderId: 'bob' }, 'set'));
    await f.write('alice', 'requests/i', req, 'set'); await f.write('eve', 'requests/i', { status: 'accepted' });
    assert.ok(f.maps['shard-1'].get('projects/p').participants.includes('eve'));
});
test('ordinary accounts cannot become organizers or create events', async () => {
    const f = fixture(); const e = { title: 'Event', description: '', date: '2026-10-10', endDate: '2026-10-11', time: '', location: '', bannerBase64: '', pfpBase64: '', requiresRegistration: true, customFields: [], isArchived: false };
    await denied(f.write('alice', 'events/e', e, 'set'));
    f.maps.master.set('organizers/alice', { email: 'alice@example.test' }); await f.write('alice', 'events/e', e, 'set'); assert.equal(f.maps['shard-1'].get('events/e').ownerId, 'alice');
    await denied(f.write('bob', 'events/e', null, 'delete'));
});
test('registrant owns identity; attendees cannot read or delete others answers', async () => {
    const f = fixture(); f.maps['shard-1'].set('events/e', { ownerId: 'alice', requiresRegistration: true, isArchived: false, customFields: [{ id: 'year' }] });
    const r = { userId: 'bob', userName: 'Bob', userEmail: 'bob@example.test', customAnswers: { year: '2' }, registeredAt: at };
    await f.write('bob', 'events/e/registrations/r', r, 'set'); await denied(f.write('eve', 'events/e/registrations/spoof', r, 'set'));
    await denied(f.call('eve', read('events/e/registrations/r'))); await denied(f.write('eve', 'events/e/registrations/r', null, 'delete'));
    f.maps.master.set('organizers/alice', { email: 'alice@example.test' }); assert.equal((await f.call('alice', read('events/e/registrations'))).docs.length, 1);
});
test('client cannot spoof notifications, but authorized actions generate them', async () => {
    const f = fixture(); await denied(f.write('eve', 'users/alice/notifications/fake', { title: 'Admin', body: 'Spoof', read: false }, 'set'));
    await f.write('alice', 'requests/r', { type: 'crew_request', senderId: 'alice', senderName: 'Alice', receiverId: 'bob', status: 'pending' }, 'set');
    const n = [...f.maps.master.keys()].find(p => p.startsWith('users/bob/notifications/')); assert.ok(n);
    await f.write('bob', n, { read: true }); await denied(f.write('eve', n, { read: true }));
});
test('banning disables Auth and blocks previously issued identity access', async () => {
    const f = fixture(); await f.call('root', { kind: 'banUser', uid: 'eve' }); assert.equal(f.people.eve.revoked, true);
    await denied(f.call('eve', read('projects/p'))); await denied(f.call('root', { kind: 'banUser', uid: 'root' }));
});
test('server refuses unknown stores/paths, excessive queries and prototype keys', async () => {
    const f = fixture(); await denied(f.call('eve', read('projects/p', { store: 'other-project' })));
    await denied(f.call('eve', read('securityRateLimits/eve'))); await denied(f.call('eve', read('projects', { limit: 10000 })));
    assert.throws(() => W.decode(JSON.parse('{"__proto__":{"admin":true}}')), P.PolicyError); assert.throws(() => W.decode({ __ppType: 'transform', name: 'execute', values: [] }), P.PolicyError);
});
test('rate quota is server owned and bounded', async () => {
    const f = fixture(); f.maps.master.set('securityRateLimits/eve', { minute: Math.floor(+at / 60000), count: 240 });
    await denied(f.call('eve', read('projects/p')));
});
test('invalid operation rolls back the whole write batch', async () => {
    const f = fixture(); await denied(f.call('alice', { kind: 'write', operations: [{ store: 'shard-1', path: 'projects/p', method: 'update', data: { title: 'Changed' } }, { store: 'shard-1', path: 'admins/alice', method: 'set', data: { role: 'root' } }] }));
    assert.equal(f.maps['shard-1'].get('projects/p').title, 'Dummy project');
});
test('project destruction removes top-level and legacy nested messages', async () => {
    const f = fixture(); f.maps['shard-1'].set('messages/m', { chatId: 'team_p', text: 'Private' }); f.maps['shard-1'].set('threads/team_p/messages/old', { text: 'Legacy' });
    await f.write('alice', 'projects/p', null, 'delete'); assert.equal(f.maps['shard-1'].has('messages/m'), false); assert.equal(f.maps['shard-1'].has('threads/team_p/messages/old'), false);
});
test('browser discards a response after account switch', async () => {
    let change, finish; const auth = { currentUser: { uid: 'alice', getIdToken: async () => 'dummy-token' }, onAuthStateChanged: fn => { change = fn; } };
    const client = createSecureDataClient(auth, { fetch: () => new Promise(resolve => { finish = () => resolve({ ok: true, json: async () => ({ result: { secret: 'dummy-private-content' } }) }); }) });
    const pending = client.requestApi({ kind: 'read' }); await new Promise(resolve => setImmediate(resolve));
    auth.currentUser = { uid: 'bob', getIdToken: async () => 'dummy-token-b' }; change(); finish(); await assert.rejects(pending, /Session changed/);
});
test('adapter encodes FieldValue updates and exposes timestamp-compatible snapshots', async () => {
    const auth = { currentUser: { uid: 'alice', getIdToken: async () => 'dummy' }, onAuthStateChanged: () => {} }; let sent;
    const client = createSecureDataClient(auth, { fetch: async (_, options) => { sent = JSON.parse(options.body); return { ok: true, json: async () => ({ result: sent.kind === 'read' ? { id: 'alice', data: { lastSeen: { __ppType: 'timestamp', seconds: 1, nanoseconds: 0 } } } : { ok: true } }) }; } });
    await client.db.collection('users').doc('alice').update({ isOnline: true, lastSeen: client.secureFieldValue.serverTimestamp() }); assert.equal(sent.operations[0].data.lastSeen.name, 'serverTimestamp');
    const snap = await client.db.collection('users').doc('alice').get(); assert.equal(snap.data().lastSeen.toDate().getTime(), 1000);
});

test('applications cannot be duplicated or rewritten by their reviewer', async () => {
    const f = fixture(), a = { projectId: 'p', applicantId: 'eve', applicantName: 'Eve', role: 'Engineer', message: 'Original', skills: '', status: 'pending' };
    await f.write('eve', 'applications/a', a, 'set');
    await denied(f.write('eve', 'applications/duplicate', a, 'set'));
    await denied(f.write('alice', 'applications/a', { message: 'Forged applicant statement', status: 'hired' }));
    assert.equal(f.maps['shard-1'].get('applications/a').message, 'Original');
});

test('registration uses existing form fields and rejects missing answers and duplicates', async () => {
    const f = fixture(); f.maps['shard-1'].set('events/e', { ownerId: 'alice', requiresRegistration: true, isArchived: false, customFields: [{ id: 'year', required: true }] });
    const r = { userId: 'bob', userName: 'Forged', userEmail: 'bob@example.test', customAnswers: {}, registeredAt: new Date('2000-01-01') };
    await denied(f.write('bob', 'events/e/registrations/r', r, 'set'));
    await f.write('bob', 'events/e/registrations/r', { ...r, customAnswers: { year: '2' } }, 'set');
    const saved = f.maps['shard-1'].get('events/e/registrations/r');
    assert.equal(saved.userName, 'Bob'); assert.equal(+saved.registeredAt, +at);
    await denied(f.write('bob', 'events/e/registrations/duplicate', { ...r, customAnswers: { year: '2' } }, 'set'));
});

test('failed cross-project acceptance remains retryable without one-sided connections', async () => {
    const f = fixture(); await f.write('alice', 'requests/r', { type: 'crew_request', senderId: 'alice', senderName: 'Alice', receiverId: 'bob', status: 'pending' }, 'set');
    const original = f.store.transaction; let masterCalls = 0;
    f.store.transaction = (key, fn) => {
        if (key === 'master' && ++masterCalls === 2) throw new Error('Dummy storage outage');
        return original(key, fn);
    };
    await assert.rejects(() => f.write('bob', 'requests/r', { status: 'accepted' }), /Dummy storage outage/);
    assert.equal(f.maps['shard-1'].get('requests/r').status, 'pending');
    assert.deepEqual(f.maps.master.get('users/alice').connections, []);
    assert.deepEqual(f.maps.master.get('users/bob').connections, []);
    await f.write('bob', 'requests/r', { status: 'accepted' });
    assert.deepEqual(f.maps.master.get('users/alice').connections, ['bob']);
    assert.deepEqual(f.maps.master.get('users/bob').connections, ['alice']);
});

test('conflicting business writes cannot erase server-derived membership or counters', async () => {
    const f = fixture();
    await denied(f.call('alice', { kind: 'write', operations: [
        { store: 'shard-1', path: 'projects/p', method: 'update', data: { participants: [] } },
        { store: 'shard-1', path: 'projects/p', method: 'update', data: { title: 'Overwrite' } }
    ] }));
    assert.deepEqual(f.maps['shard-1'].get('projects/p').participants, ['bob']);
});
