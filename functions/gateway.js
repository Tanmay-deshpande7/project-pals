"use strict";
const P = require("./policy"), W = require("./wire");

// Injected storage/auth allow security regression tests without production access.
function createGateway({ store, auth, now = () => new Date(), chooseShard = () => "shard-1", newId }) {
    const notice = (uid, title, body, type) => store.set("master", `users/${P.identifier(uid)}/notifications/${newId()}`, { title, body, type, read: false, createdAt: now() });
    async function context(uid) {
        const u = await auth.getUser(uid); P.requireThat(!u.disabled && u.email, "Account unavailable", 401);
        const [a, o] = await Promise.all([store.get("master", `admins/${uid}`), store.get("master", `organizers/${uid}`)]);
        // Only a verified UID registry grants authority. Email invitations never do.
        const verified = u.emailVerified === true;
        return { uid, email: u.email, name: u.displayName || "User", emailVerified: verified, role: verified && a?.email?.toLowerCase() === u.email.toLowerCase() ? a.role : null, organizer: verified && o?.email?.toLowerCase() === u.email.toLowerCase() };
    }
    async function rate(uid) {
        await store.transaction("master", async t => {
            const path = `securityRateLimits/${uid}`, old = await t.get(path), minute = Math.floor(+now() / 60000), count = old?.minute === minute ? old.count : 0;
            P.requireThat(count < 240, "Too many requests; retry shortly", 429); t.set(path, { minute, count: count + 1 });
        });
    }
    async function bootstrap(c) {
        let shard;
        await store.transaction("master", async t => {
            const path = `users/${c.uid}`, old = await t.get(path);
            shard = Object.hasOwn(P.STORES, old?.shardId || "") ? old.shardId : (P.isAdmin(c) ? "master" : chooseShard());
            P.requireThat(Object.hasOwn(P.STORES, shard), "Invalid shard assignment", 500);
            t.set(path, { ...(old || {}), displayName: c.name, email: c.email, networkId: c.uid.slice(0, 8).toUpperCase(), shardId: shard, createdAt: old?.createdAt || now(), connections: old?.connections || [] });
        });
        return { shard, admin: P.isAdmin(c), root: P.isRoot(c), organizer: P.isOrganizer(c), emailVerified: c.emailVerified };
    }
    function getter(key, t) {
        return async (path, q) => {
            const actual = P.resolveStore(key, path), local = t && actual === key;
            if (q) return (local ? await t.query(path, q) : await store.query(actual, path, q)).map(x => x.data);
            return local ? t.get(path) : store.get(actual, path);
        };
    }
    async function read(c, input) {
        const key = P.resolveStore(input.store, input.path), a = P.pathParts(input.path), get = getter(key);
        if (a.length % 2 === 0) {
            const d = await get(input.path); P.requireThat(await P.canRead(c, input.path, d, get));
            return { id: a.at(-1), data: W.encode(a[0] === "users" && a.length === 2 ? P.publicUser(c, a[1], d) : d) };
        }
        const q = { filters: input.filters || [], order: input.order || null, limit: input.limit || 200 }; await P.authorizeQuery(c, input.path, q, get);
        if (a[0] === "messages" && !q.order) q.order = ["createdAt", "desc"];
        const records = await store.query(key, input.path, q), docs = [];
        for (const r of records) if (await P.canRead(c, `${input.path}/${r.id}`, r.data, get)) docs.push({ id: r.id, data: W.encode(a[0] === "users" && a.length === 1 ? P.publicUser(c, r.id, r.data) : r.data) });
        return { docs, windowLimit: q.limit };
    }
    async function cleanup(key, kind, id) {
        const lists = kind === "event" ? [[`events/${id}/registrations`, []]] : [["applications", [["projectId", "==", id]]], ["threads", [["projectId", "==", id]]]];
        for (const [collection, filters] of lists) {
            let docs;
            do {
                docs = await store.query(key, collection, { filters, limit: 100 });
                if (collection === "threads") for (const d of docs) for (const [messages, f] of [["messages", [["chatId", "==", d.id]]], [`threads/${d.id}/messages`, []]]) {
                    let ms; do { ms = await store.query(key, messages, { filters: f, limit: 100 }); await store.deleteMany(key, ms.map(m => `${messages}/${m.id}`)); } while (ms.length === 100);
                }
                await store.deleteMany(key, docs.map(d => `${collection}/${d.id}`));
            } while (docs.length === 100);
        }
    }
    async function write(c, input) {
        const ops = input.operations; P.requireThat(Array.isArray(ops) && ops.length >= 1 && ops.length <= 50, "Invalid write batch", 400);
        const keys = ops.map(o => P.resolveStore(o.store, o.path)); P.requireThat(new Set(keys).size === 1, "A batch must use one database", 400);
        // Derived membership and counters depend on the prior committed state.
        // Separate business actions avoid conflicting derived writes in a batch.
        P.requireThat(ops.length === 1 || ops.every(o => o.path.startsWith(`users/${c.uid}/notifications/`)), "Business actions must be committed individually", 400);
        P.requireThat(new Set(ops.map(o => o.path)).size === ops.length, "Duplicate write path", 400);
        const key = keys[0], notices = [], connections = [], cascades = [];
        await store.transaction(key, async t => {
            notices.length = 0; connections.length = 0; cascades.length = 0;
            const get = getter(key, t), queue = [];
            for (const op of ops) {
                const a = P.pathParts(op.path); P.requireThat(["set", "update", "delete"].includes(op.method), "Invalid method", 400);
                const before = await get(op.path); P.requireThat(op.method !== "update" || before, "Document does not exist", 404);
                const patch = op.method === "delete" ? null : W.decode(op.data); P.requireThat(patch === null || (patch && typeof patch === "object" && !Array.isArray(patch)), "Document expected", 400);
                const after = patch === null ? null : W.materialize(before, patch, op.method === "update" || op.merge === true, now());
                if (after && !before) {
                    after.createdAt = now();
                    if (a[0] === "events" && a.length === 2) after.ownerId = c.uid;
                    if (a[0] === "projects") after.authorName = c.name;
                    if (a[0] === "applications") after.applicantName = c.name;
                    if (a[0] === "messages") after.senderName = c.name;
                    if (a[0] === "requests") after.senderName = c.name;
                    if (a[0] === "events" && a[2] === "registrations") { after.registeredAt = now(); after.userName = c.name; }
                }
                if (after && Object.hasOwn(after, "updatedAt")) after.updatedAt = now();
                await P.authorizeWrite(c, op.path, before, after, get); queue.push({ path: op.path, data: after });
                if (a[0] === "projects") {
                    if (!after) cascades.push(["project", a[1]]);
                    else { const thread = await get(`threads/team_${a[1]}`); if (thread) queue.push({ path: `threads/team_${a[1]}`, data: { ...thread, participants: [...new Set([after.authorId, ...after.participants])] } }); }
                }
                if (a[0] === "events" && a.length === 2 && !after) cascades.push(["event", a[1]]);
                if (a[0] === "applications" && after) {
                    const p = await get(`projects/${after.projectId}`);
                    if (!before) notices.push([p.authorId, "New application", `${c.name} applied to ${p.title}.`, "application_update"]);
                    else if (before.status !== after.status) {
                        notices.push([after.applicantId, "Application update", `Your application to ${p.title} is ${after.status}.`, "application_update"]);
                        if (after.status === "hired") {
                            P.requireThat((p.participants || []).includes(after.applicantId) || (p.participants || []).length < 100, "Project member limit reached", 409);
                            P.requireThat((p.roles || []).every(r => r.title !== after.role || !r.assigneeId || r.assigneeId === "pending" || r.assigneeId === after.applicantId), "This role is already assigned", 409);
                            const participants = [...new Set([...(p.participants || []), after.applicantId])], roles = (p.roles || []).map(r => r.title === after.role ? { ...r, assigneeId: after.applicantId } : r);
                            queue.push({ path: `projects/${after.projectId}`, data: { ...p, participants, roles } });
                            const id = `team_${after.projectId}`, thread = await get(`threads/${id}`);
                            queue.push({ path: `threads/${id}`, data: { ...(thread || {}), chatId: id, projectId: after.projectId, projectTitle: `${p.title} (Team Chat)`, participants: [...new Set([p.authorId, ...participants])] } });
                        }
                    }
                }
                if (a[0] === "requests" && after) {
                    if (!before) notices.push([after.receiverId, "New request", after.type === "project_invite" ? "You have a project invitation." : `${c.name} sent a connection request.`, after.type]);
                    if (after.status === "accepted" && before && ["pending", "accepted"].includes(before.status)) {
                        if (after.type === "crew_request") connections.push([after.senderId, after.receiverId, op.path]);
                        else {
                            const p = await get(`projects/${after.projectId}`); P.requireThat(p?.authorId === after.senderId, "Invitation owner changed");
                            P.requireThat((p.participants || []).includes(c.uid) || (p.participants || []).length < 100, "Project member limit reached", 409);
                            const participants = [...new Set([...(p.participants || []), c.uid])]; queue.push({ path: `projects/${after.projectId}`, data: { ...p, participants } });
                            const thread = await get(`threads/team_${after.projectId}`); if (thread) queue.push({ path: `threads/team_${after.projectId}`, data: { ...thread, participants: [...new Set([p.authorId, ...participants])] } });
                        }
                    }
                }
                if (a[0] === "messages" && after) {
                    const id = after.chatId, current = await get(`threads/${id}`), people = await P.chatMembers(get, id, current); let thread = current || {};
                    if (id.startsWith("team_")) { const projectId = id.slice(5), p = await get(`projects/${projectId}`); thread = { ...thread, chatId: id, projectId, projectTitle: `${p.title} (Team Chat)` }; }
                    thread = { ...thread, participants: people, lastMessage: after.text, lastUpdated: now() };
                    for (const uid of people.filter(x => x !== c.uid)) { const k = `unreadCount_${uid}`; thread[k] = Math.min((thread[k] || 0) + 1, 100000); if (thread[k] === 10) notices.push([uid, "New unread messages", "You have 10 unread messages in a project conversation.", "chat"]); }
                    queue.push({ path: `threads/${id}`, data: thread });
                }
            }
            // Finish every authorization/read before sending transaction writes.
            for (const item of queue) item.data === null ? t.delete(item.path) : t.set(item.path, item.data);
        });
        for (const [left, right, requestPath] of connections) {
            // There is no cross-project transaction. Shard acceptance is durable;
            // the master update is atomic/idempotent, and an acceptance retry completes it.
            try { await store.transaction("master", async t => {
                const a = await t.get(`users/${left}`), b = await t.get(`users/${right}`); P.requireThat(a && b, "Both profiles must exist", 409);
                const ac = [...new Set([...(a.connections || []), right])], bc = [...new Set([...(b.connections || []), left])]; P.requireThat(ac.length <= 100 && bc.length <= 100, "Connection limit reached", 409);
                t.set(`users/${left}`, { ...a, connections: ac }); t.set(`users/${right}`, { ...b, connections: bc });
            }); } catch (err) {
                // Keep failed acceptances visible in the recipient's pending list.
                // Profile updates are atomic and retries are idempotent.
                await store.transaction(key, async t => {
                    const request = await t.get(requestPath);
                    if (request?.status === "accepted") t.set(requestPath, { ...request, status: "pending" });
                }).catch(() => {});
                throw err;
            }
        }
        for (const [kind, id] of cascades) await cleanup(key, kind, id);
        await Promise.all(notices.map(n => notice(...n).catch(() => { /* Optional delivery must not repeat a committed action. */ })));
        return { ok: true };
    }
    async function manageAdmin(c, input) {
        P.requireThat(P.isRoot(c), "Root administrator required");
        if (input.operation === "grant") {
            P.requireThat(typeof input.email === "string" && input.email.length <= 254, "Invalid email", 400); const u = await auth.getUserByEmail(input.email.trim());
            P.requireThat(u && u.emailVerified && !u.disabled, "Account must exist and verify its email first", 409);
            const existing = await store.get("master", `admins/${u.uid}`); P.requireThat(existing?.role !== "root", "Cannot replace a root administrator");
            await store.set("master", `admins/${u.uid}`, { email: u.email, role: "admin", addedAt: now(), addedBy: c.uid });
        } else {
            P.requireThat(input.operation === "revoke", "Invalid operation", 400); P.identifier(input.uid); const target = await store.get("master", `admins/${input.uid}`);
            P.requireThat(target && target.role !== "root" && input.uid !== c.uid, "Cannot remove root privilege here"); await store.deleteMany("master", [`admins/${input.uid}`]);
        }
        return { ok: true };
    }
    async function dispatch(uid, input) {
        P.identifier(uid); P.requireThat(input && typeof input === "object", "Invalid request", 400); const c = await context(uid); await rate(uid);
        if (input.kind === "bootstrap") return bootstrap(c);
        if (input.kind === "access") return { admin: P.isAdmin(c), root: P.isRoot(c), organizer: P.isOrganizer(c), emailVerified: c.emailVerified };
        if (input.kind === "read") return read(c, input);
        if (input.kind === "write") return write(c, input);
        if (input.kind === "manageAdmin") return manageAdmin(c, input);
        if (input.kind === "banUser") {
            P.requireThat(P.isAdmin(c)); P.identifier(input.uid); P.requireThat(input.uid !== c.uid && !(await store.get("master", `admins/${input.uid}`)), "Cannot ban an administrator here");
            await auth.updateUser(input.uid, { disabled: true }); await auth.revokeRefreshTokens(input.uid); return { ok: true };
        }
        throw new P.PolicyError("Unknown operation", 400);
    }
    return { dispatch, context };
}
module.exports = { createGateway };
