"use strict";

// All browser requests pass this policy, including requests made outside the UI.
// The Admin SDK bypasses Rules, so authentication alone must never authorize data.
const STORES = Object.freeze({ master: "projectpals-66223", "shard-1": "projectpals-shard-1", "shard-2": "projectpals-shard-2", "shard-3": "projectpals-shard-3", "shard-4": "projectpals-shard-4" });
const SHARED = new Set(["users", "admins", "organizers"]);
const COLLECTIONS = new Set([...SHARED, "projects", "applications", "threads", "messages", "requests", "events"]);
class PolicyError extends Error {
    constructor(message, status = 403) { super(message); this.status = status; }
}
const requireThat = (condition, message = "Access denied", status = 403) => { if (!condition) throw new PolicyError(message, status); };
const isAdmin = c => c.emailVerified === true && ["admin", "root"].includes(c.role);
const isRoot = c => c.emailVerified === true && c.role === "root";
const isOrganizer = c => isAdmin(c) || (c.emailVerified === true && c.organizer === true);
const member = (c, p) => !!p && (p.authorId === c.uid || (Array.isArray(p.participants) && p.participants.includes(c.uid)));
const comparable = x => x && typeof x.toDate === "function" ? x.toDate() : x;
const same = (a, b) => JSON.stringify(comparable(a)) === JSON.stringify(comparable(b));
const changed = (a, b) => [...new Set([...Object.keys(a || {}), ...Object.keys(b || {})])].filter(k => !same(a?.[k], b?.[k]));
function identifier(s) { requireThat(typeof s === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(s), "Invalid identifier", 400); return s; }
function pathParts(p) {
    requireThat(typeof p === "string" && p.length <= 512, "Invalid path", 400);
    const a = p.split("/"); a.forEach(identifier);
    requireThat(COLLECTIONS.has(a[0]), "Unknown collection", 400);
    requireThat(a.length <= 4 && (a.length <= 2 || (a[0] === "users" && a[2] === "notifications") || (a[0] === "events" && a[2] === "registrations") || (a[0] === "threads" && a[2] === "messages")), "Unknown nested collection", 400);
    return a;
}
function resolveStore(key, p) { requireThat(Object.hasOwn(STORES, key), "Unknown database", 400); return SHARED.has(pathParts(p)[0]) ? "master" : key; }
const text = (s, max, required = false) => typeof s === "string" && s.length <= max && (!required || s.trim().length > 0);
const strings = (a, max) => Array.isArray(a) && a.length <= max && a.every(x => typeof x === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(x)) && new Set(a).size === a.length;
function fields(data, allowed) { requireThat(data && typeof data === "object" && !Array.isArray(data), "Invalid document", 400); requireThat(Object.keys(data).every(k => allowed.includes(k)), "Unexpected document field", 400); }
function immutable(before, after, keys) { if (before) requireThat(keys.every(k => same(before[k], after[k])), "Identity and ownership fields are immutable"); }
async function project(get, id) { identifier(id); const p = await get(`projects/${id}`); requireThat(p, "Project does not exist", 404); return p; }
async function chatMembers(get, id, existing = null) {
    identifier(id);
    if (id.startsWith("team_")) {
        const p = await project(get, id.slice(5)); return [...new Set([p.authorId, ...(p.participants || [])])];
    }
    // Legacy private threads remain bound to a project and an actual application.
    const t = existing || await get(`threads/${id}`);
    requireThat(t && strings(t.participants, 2) && t.participants.length === 2, "Unknown private conversation");
    const p = await project(get, t.projectId);
    requireThat(t.participants.includes(p.authorId), "Invalid conversation owner");
    const other = t.participants.find(uid => uid !== p.authorId);
    const applications = await get("applications", { filters: [["projectId", "==", t.projectId], ["applicantId", "==", other]], limit: 1 });
    requireThat(applications.length > 0, "No application authorizes this conversation");
    return t.participants;
}
async function canRead(c, path, d, get) {
    const a = pathParts(path); requireThat(c.uid, "Sign in required", 401);
    if (isAdmin(c)) return true;
    if (a[0] === "admins") return a.length === 2 && a[1] === c.uid;
    if (a[0] === "organizers") return a.length === 2 && a[1] === c.uid;
    if (a[0] === "users") return a.length === 2 || (a[2] === "notifications" && a[1] === c.uid);
    if (a[0] === "projects" || (a[0] === "events" && a.length === 2)) return true;
    if (!d) return false;
    if (a[0] === "applications") return d.applicantId === c.uid || (await project(get, d.projectId)).authorId === c.uid;
    if (a[0] === "requests") return d.senderId === c.uid || d.receiverId === c.uid || (d.type === "project_invite" && (await project(get, d.projectId)).authorId === c.uid);
    if (a[0] === "threads" || a[0] === "messages") {
        const id = a[0] === "threads" ? a[1] : d.chatId;
        return (await chatMembers(get, id, a[0] === "threads" ? d : null)).includes(c.uid);
    }
    if (a[0] === "events" && a[2] === "registrations") {
        const e = await get(`events/${a[1]}`); return d.userId === c.uid || (isOrganizer(c) && e?.ownerId === c.uid);
    }
    return false;
}
function publicUser(c, id, d) {
    if (!d || id === c.uid || isAdmin(c)) return d;
    // Network discovery needs public profile information, never email/connections.
    return Object.fromEntries(["displayName", "networkId", "isOnline", "lastSeen"].filter(k => Object.hasOwn(d, k)).map(k => [k, d[k]]));
}
async function authorizeQuery(c, path, query, get) {
    const a = pathParts(path); requireThat(a.length % 2 === 1, "Collection expected", 400);
    requireThat(Array.isArray(query.filters) && query.filters.length <= 5, "Invalid query", 400);
    const has = (f, op, v) => query.filters.some(x => x[0] === f && x[1] === op && same(x[2], v));
    const eq = f => query.filters.find(x => x[0] === f && x[1] === "==")?.[2];
    const safeFields = ["__name__", "networkId", "projectId", "applicantId", "senderId", "receiverId", "status", "participants", "chatId", "userId", "email", "ownerId"];
    for (const f of query.filters) requireThat(Array.isArray(f) && f.length === 3 && safeFields.includes(f[0]) && ["==", "in", "array-contains"].includes(f[1]) && (f[1] !== "in" || (Array.isArray(f[2]) && f[2].length >= 1 && f[2].length <= 10)), "Unsupported query", 400);
    requireThat(!query.order || (Array.isArray(query.order) && ["createdAt", "lastUpdated"].includes(query.order[0]) && ["asc", "desc"].includes(query.order[1])), "Unsupported order", 400);
    requireThat(!query.limit || (Number.isInteger(query.limit) && query.limit >= 1 && query.limit <= 200), "Invalid query limit", 400);
    if (isAdmin(c)) return;
    if (a[0] === "users" && a.length === 1) { requireThat(query.filters.length > 0 && query.filters.every(x => ["networkId", "__name__"].includes(x[0])), "Use a profile identifier"); return; }
    if (a[0] === "users" && a[2] === "notifications") { requireThat(a[1] === c.uid); return; }
    if (a[0] === "projects" || (a[0] === "events" && a.length === 1)) return;
    if (a[0] === "applications") { requireThat(has("applicantId", "==", c.uid) || (eq("projectId") && (await project(get, eq("projectId"))).authorId === c.uid)); return; }
    if (a[0] === "requests") { requireThat(has("receiverId", "==", c.uid) || has("senderId", "==", c.uid) || (eq("projectId") && (await project(get, eq("projectId"))).authorId === c.uid)); return; }
    if (a[0] === "threads") { requireThat(has("participants", "array-contains", c.uid)); return; }
    if (a[0] === "messages") { requireThat(eq("chatId") && (await chatMembers(get, eq("chatId"))).includes(c.uid)); return; }
    if (a[0] === "events" && a[2] === "registrations") { const e = await get(`events/${a[1]}`); requireThat(has("userId", "==", c.uid) || (isOrganizer(c) && e?.ownerId === c.uid)); return; }
    throw new PolicyError("Collection query denied");
}
async function authorizeWrite(c, path, before, after, get) {
    const a = pathParts(path); requireThat(a.length % 2 === 0, "Document expected", 400); requireThat(c.uid, "Sign in required", 401);
    const deleting = after === null;
    // Privileged registry changes and Auth account bans use dedicated server actions.
    requireThat(!["admins", "organizers"].includes(a[0]), "Use trusted privilege management");
    if (a[0] === "users" && a.length === 2) {
        requireThat(a[1] === c.uid && !deleting, "Only your own profile may be edited");
        requireThat(changed(before, after).every(k => ["displayName", "email", "networkId", "isOnline", "lastSeen", "createdAt"].includes(k)), "Profile authority fields are server managed");
        requireThat(text(after.displayName, 100) && after.email === c.email && (!after.networkId || after.networkId === c.uid.slice(0, 8).toUpperCase()), "Invalid profile", 400);
        if (after.isOnline !== undefined) requireThat(typeof after.isOnline === "boolean", "Invalid presence", 400);
        if (after.lastSeen !== undefined) requireThat(after.lastSeen instanceof Date || typeof after.lastSeen?.toDate === "function", "Invalid presence timestamp", 400);
        immutable(before, after, ["createdAt", "networkId"]); return;
    }
    if (a[0] === "users" && a[2] === "notifications") {
        requireThat(a[1] === c.uid && before && !deleting && changed(before, after).every(k => k === "read") && typeof after.read === "boolean", "Notifications are generated by the server"); return;
    }
    if (a[0] === "projects") {
        requireThat(before ? (before.authorId === c.uid || isAdmin(c)) : after?.authorId === c.uid);
        if (deleting) return;
        fields(after, ["title", "description", "roles", "authorId", "authorName", "participants", "createdAt", "status", "updatedAt"]);
        requireThat(text(after.title, 160, true) && text(after.description, 12000) && text(after.authorName, 100) && strings(after.participants, 100) && Array.isArray(after.roles) && after.roles.length <= 30 && ["active", "ongoing", "completed", "closed"].includes(after.status), "Invalid project", 400);
        after.roles.forEach(r => { fields(r, ["id", "title", "description", "assigneeId", "assigneeName"]); requireThat(text(r.title, 100, true) && (!r.description || text(r.description, 2000)) && (!r.assigneeId || r.assigneeId === "pending" || after.participants.includes(r.assigneeId)), "Invalid project role", 400); });
        immutable(before, after, ["authorId", "createdAt"]); return;
    }
    if (a[0] === "applications") {
        const p = await project(get, (before || after).projectId), owner = p.authorId === c.uid || isAdmin(c);
        requireThat(before ? (owner || before.applicantId === c.uid) : after.applicantId === c.uid);
        if (deleting) { requireThat(owner || before.status === "pending"); return; }
        fields(after, ["projectId", "applicantId", "applicantName", "role", "message", "skills", "createdAt", "updatedAt", "status"]);
        requireThat(text(after.applicantName, 100) && text(after.role, 100, true) && text(after.message, 6000) && text(after.skills, 2000) && ["pending", "hired", "rejected", "removed"].includes(after.status), "Invalid application", 400);
        immutable(before, after, ["projectId", "applicantId", "createdAt"]);
        if (!before) requireThat(after.status === "pending");
        else if (owner) requireThat(changed(before, after).every(k => ["status", "updatedAt"].includes(k)), "Owners may decide applications, not rewrite applicant content");
        else if (!owner) requireThat(before.status === "pending" && changed(before, after).every(k => ["role", "message", "skills", "updatedAt"].includes(k)), "Applicants cannot decide their own applications");
        if (!before) requireThat((await get("applications", { filters: [["projectId", "==", after.projectId], ["applicantId", "==", c.uid]], limit: 1 })).length === 0, "You already applied to this project", 409);
        return;
    }
    if (a[0] === "requests") {
        requireThat(!deleting, "Resolve requests instead of deleting them");
        fields(after, ["type", "senderId", "senderName", "receiverId", "projectId", "projectTitle", "createdAt", "updatedAt", "status"]);
        identifier(after.senderId); identifier(after.receiverId);
        requireThat(after.senderId !== after.receiverId && text(after.senderName, 100) && ["crew_request", "project_invite"].includes(after.type) && ["pending", "accepted", "rejected"].includes(after.status), "Invalid request", 400);
        if (!before) { requireThat(after.senderId === c.uid && after.status === "pending"); if (after.type === "project_invite") requireThat((await project(get, after.projectId)).authorId === c.uid); }
        else { requireThat(before.receiverId === c.uid && ["pending", after.status].includes(before.status) && ["accepted", "rejected"].includes(after.status)); requireThat(changed(before, after).every(k => ["status", "updatedAt"].includes(k)), "Invitation identities are immutable"); }
        return;
    }
    if (a[0] === "threads") {
        const people = await chatMembers(get, a[1], before || after);
        requireThat(people.includes(c.uid) || isAdmin(c));
        if (deleting) { requireThat(isAdmin(c), "Only administrators may destroy a conversation"); return; }
        // Participants/last-message/counters come from authoritative server transitions.
        requireThat(before && changed(before, after).every(k => k === `unreadCount_${c.uid}`) && after[`unreadCount_${c.uid}`] === 0, "Conversation state is server managed"); return;
    }
    if (a[0] === "messages") {
        requireThat(!before && !deleting, "Messages cannot be rewritten");
        fields(after, ["chatId", "text", "senderId", "senderName", "createdAt"]);
        requireThat(after.senderId === c.uid && text(after.text, 6000, true) && text(after.senderName, 100) && (await chatMembers(get, after.chatId)).includes(c.uid), "Only conversation members may send messages"); return;
    }
    if (a[0] === "events" && a.length === 2) {
        requireThat(isOrganizer(c) && (!before || before.ownerId === c.uid || isAdmin(c)), "Organizer ownership required");
        if (deleting) return;
        fields(after, ["ownerId", "title", "description", "date", "endDate", "time", "location", "bannerBase64", "pfpBase64", "requiresRegistration", "customFields", "createdAt", "isArchived"]);
        requireThat(after.ownerId === (before?.ownerId || c.uid) && text(after.title, 160, true) && text(after.description, 12000) && text(after.location, 500) && typeof after.requiresRegistration === "boolean" && typeof after.isArchived === "boolean" && Array.isArray(after.customFields) && after.customFields.length <= 20 && text(after.endDate, 40, true) && Number.isFinite(Date.parse(after.endDate)), "Invalid event", 400);
        requireThat(text(after.date, 40, true) && Number.isFinite(Date.parse(after.date)) && text(after.time, 40) && Date.parse(after.endDate) >= Date.parse(after.date), "Invalid event dates", 400);
        for (const image of [after.bannerBase64, after.pfpBase64]) requireThat(!image || (text(image, 500000) && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image)), "Use a bounded image data URL", 400);
        for (const f of after.customFields) { fields(f, ["id", "label", "type", "required", "options"]); requireThat(text(f.id, 100, true) && !["__proto__", "constructor", "prototype"].includes(f.id) && text(f.label, 160, true) && ["text", "email", "number", "tel", "textarea", "select", "dropdown"].includes(f.type) && typeof f.required === "boolean" && (!f.options || text(f.options, 2000)), "Invalid registration field", 400); }
        immutable(before, after, ["ownerId", "createdAt"]); return;
    }
    if (a[0] === "events" && a[2] === "registrations") {
        const e = await get(`events/${a[1]}`); requireThat(e, "Event does not exist", 404);
        if (deleting) { requireThat(isAdmin(c) || (isOrganizer(c) && e.ownerId === c.uid)); return; }
        requireThat(!before && after.userId === c.uid && !e.isArchived && e.requiresRegistration === true, "Invalid registration");
        fields(after, ["userId", "userName", "userEmail", "customAnswers", "registeredAt", "createdAt"]);
        requireThat(after.userEmail === c.email && text(after.userName, 100) && after.customAnswers && typeof after.customAnswers === "object" && !Array.isArray(after.customAnswers) && Object.keys(after.customAnswers).length <= 20, "Invalid registration fields", 400);
        const allowed = new Set((e.customFields || []).map(f => f.id));
        requireThat(Object.entries(after.customAnswers).every(([k, v]) => allowed.has(k) && text(v, 3000)), "Invalid registration answer", 400);
        requireThat((e.customFields || []).every(f => !f.required || text(after.customAnswers[f.id], 3000, true)), "Complete required registration fields", 400);
        requireThat((await get(`events/${a[1]}/registrations`, { filters: [["userId", "==", c.uid]], limit: 1 })).length === 0, "Already registered for this event", 409); return;
    }
    throw new PolicyError("Operation denied");
}
module.exports = { STORES, PolicyError, requireThat, isAdmin, isRoot, isOrganizer, identifier, pathParts, resolveStore, member, canRead, authorizeQuery, authorizeWrite, publicUser, chatMembers, changed };
