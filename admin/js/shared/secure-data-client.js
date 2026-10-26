/* Security: the browser never holds shard credentials or a persistent data cache.
 * This small Firestore-shaped adapter keeps the existing components while every
 * read/write is authorized by the server. Subscriptions refresh every 15 seconds.
 */
(function (root) {
    function createSecureDataClient(auth, options = {}) {
        const transport = options.fetch || root.fetch.bind(root);
        const pending = new Set(), subscriptions = new Set();
        let generation = 0, activeShard = 'master';
        const cancel = () => { generation++; pending.forEach(c => c.abort()); pending.clear(); subscriptions.forEach(stop => stop()); subscriptions.clear(); activeShard = 'master'; };
        auth.onAuthStateChanged(cancel);
        const timestamp = v => ({ seconds: v.seconds, nanoseconds: v.nanoseconds, toDate: () => new Date(v.seconds * 1000 + v.nanoseconds / 1000000) });
        function revive(v) {
            if (v && v.__ppType === 'timestamp') return timestamp(v);
            if (Array.isArray(v)) return v.map(revive);
            if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, revive(x)]));
            return v;
        }
        function encode(v) {
            if (v instanceof Date) return { __ppType: 'date', value: v.toISOString() };
            if (v && typeof v.toDate === 'function') return { __ppType: 'date', value: v.toDate().toISOString() };
            if (Array.isArray(v)) return v.map(encode);
            if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]));
            return v;
        }
        async function requestApi(input) {
            const u = auth.currentUser, epoch = generation;
            if (!u) throw new Error('Sign in required');
            const controller = new AbortController(); pending.add(controller);
            try {
                const token = await u.getIdToken();
                if (auth.currentUser?.uid !== u.uid || epoch !== generation) throw new Error('Session changed');
                const response = await transport('/api/collaboration', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(encode(input)), signal: controller.signal, cache: 'no-store' });
                const payload = await response.json();
                // A response initiated by the previous account never reaches its successor.
                if (auth.currentUser?.uid !== u.uid || epoch !== generation) throw new Error('Session changed');
                if (!response.ok) throw new Error(payload.error || 'Request failed');
                return revive(payload.result);
            } finally { pending.delete(controller); }
        }
        class Reference {
            constructor(db, path, filters = [], order = null, cap = null) { this.firestore = db; this.path = path; this.id = path.split('/').at(-1); this.filters = filters; this.order = order; this.cap = cap; }
            collection(name) { return new Reference(this.firestore, `${this.path}/${name}`); }
            doc(id = root.crypto.randomUUID()) { return new Reference(this.firestore, `${this.path}/${id}`); }
            where(field, op, value) { return new Reference(this.firestore, this.path, [...this.filters, [field, op, value]], this.order, this.cap); }
            orderBy(field, direction = 'asc') { return new Reference(this.firestore, this.path, this.filters, [field, direction], this.cap); }
            limit(n) { return new Reference(this.firestore, this.path, this.filters, this.order, n); }
            async get() {
                const result = await requestApi({ kind: 'read', store: this.firestore.key, path: this.path, filters: this.filters, order: this.order, limit: this.cap });
                if (this.path.split('/').length % 2 === 0) return this.snapshot(result);
                const docs = result.docs.map(d => this.doc(d.id).snapshot(d));
                return { docs, empty: docs.length === 0, size: docs.length, forEach: fn => docs.forEach(fn), docChanges: () => docs.map(doc => ({ type: 'added', doc })) };
            }
            snapshot(r) { return { id: r.id, ref: this, exists: r.data !== null, data: () => r.data }; }
            onSnapshot(next, error = err => console.warn('Data refresh failed:', err.message)) {
                let stopped = false, timer, previous = new Map();
                const epoch = generation, uid = auth.currentUser?.uid;
                const stop = () => { stopped = true; clearTimeout(timer); previous.clear(); subscriptions.delete(stop); };
                subscriptions.add(stop);
                const poll = async () => {
                    if (stopped || generation !== epoch || auth.currentUser?.uid !== uid) { stop(); return; }
                    try {
                        const snap = await this.get();
                        if (stopped) return;
                        if (snap.docs) {
                            const changes = [], current = new Map(snap.docs.map(d => [d.id, d]));
                            for (const d of snap.docs) { const old = previous.get(d.id); if (!old || JSON.stringify(old.data()) !== JSON.stringify(d.data())) changes.push({ type: old ? 'modified' : 'added', doc: d }); }
                            for (const [id, doc] of previous) if (!current.has(id)) changes.push({ type: 'removed', doc });
                            snap.docChanges = () => changes; previous = current;
                        }
                        next(snap);
                    } catch (err) { if (!stopped) error(err); }
                    if (!stopped) timer = setTimeout(poll, options.refreshMs || 15000);
                };
                poll(); return stop;
            }
            operation(method, data, opts) { return { store: this.firestore.key, path: this.path, method, ...(data ? { data } : {}), merge: opts?.merge === true }; }
            set(data, opts) { return requestApi({ kind: 'write', operations: [this.operation('set', data, opts)] }); }
            update(data) { return requestApi({ kind: 'write', operations: [this.operation('update', data)] }); }
            delete() { return requestApi({ kind: 'write', operations: [this.operation('delete')] }); }
            async add(data) { const doc = this.doc(); await doc.set(data); return doc; }
        }
        class Database {
            constructor(key) { this.key = key; }
            collection(path) { return new Reference(this, path); }
            doc(path) { return new Reference(this, path); }
            batch() {
                const operations = [];
                const batch = { set: (r, d, o) => { operations.push(r.operation('set', d, o)); return batch; }, update: (r, d) => { operations.push(r.operation('update', d)); return batch; }, delete: r => { operations.push(r.operation('delete')); return batch; }, commit: () => operations.length ? requestApi({ kind: 'write', operations }) : Promise.resolve() };
                return batch;
            }
        }
        const shardDbs = Object.fromEntries(['master', 'shard-1', 'shard-2', 'shard-3', 'shard-4'].map(key => [key, new Database(key)]));
        const shared = new Set(['users', 'admins', 'organizers']);
        const db = { collection: path => shardDbs[shared.has(path.split('/')[0]) ? 'master' : activeShard].collection(path), doc: path => shardDbs[shared.has(path.split('/')[0]) ? 'master' : activeShard].doc(path), batch: () => shardDbs[activeShard].batch() };
        const secureFieldValue = Object.fromEntries(['arrayUnion', 'arrayRemove', 'increment', 'serverTimestamp', 'delete'].map(name => [name, (...values) => ({ __ppType: 'transform', name, values })]));
        return { db, masterDb: shardDbs.master, shardDbs, requestApi, secureFieldValue, cancel, initializeUserShard: async () => { const result = await requestApi({ kind: 'bootstrap' }); activeShard = result.shard; return result; } };
    }
    root.createSecureDataClient = createSecureDataClient;
    if (typeof module !== 'undefined') module.exports = { createSecureDataClient };
})(typeof window !== 'undefined' ? window : globalThis);
