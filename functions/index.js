"use strict";
const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp, getApps, applicationDefault } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldPath } = require("firebase-admin/firestore");
const { randomInt, randomUUID } = require("node:crypto");
const { STORES } = require("./policy");
const { createGateway } = require("./gateway");
const { createHttpHandler } = require("./http");
const databases = new Map();
function database(key) {
    if (!databases.has(key)) {
        const name = `data-${key}`;
        const app = getApps().find(a => a.name === name) || initializeApp({ credential: applicationDefault(), projectId: STORES[key] }, name);
        databases.set(key, getFirestore(app));
    }
    return databases.get(key);
}
const identity = getAuth(initializeApp({ projectId: STORES.master }));
function query(db, path, q) {
    let ref = db.collection(path);
    for (const [f, op, v] of q.filters || []) ref = ref.where(f === "__name__" ? FieldPath.documentId() : f, op, v);
    if (q.order) ref = ref.orderBy(...q.order);
    return ref.limit(q.limit || 200);
}
const rows = snap => snap.docs.map(d => ({ id: d.id, data: d.data() }));
const store = {
    get: async (key, path) => { const d = await database(key).doc(path).get(); return d.exists ? d.data() : null; },
    query: async (key, path, q) => rows(await query(database(key), path, q).get()),
    set: (key, path, data) => database(key).doc(path).set(data),
    deleteMany: async (key, paths) => { if (!paths.length) return; const db = database(key), batch = db.batch(); paths.forEach(p => batch.delete(db.doc(p))); await batch.commit(); },
    transaction: (key, action) => {
        const db = database(key);
        return db.runTransaction(tx => action({
            get: async path => { const d = await tx.get(db.doc(path)); return d.exists ? d.data() : null; },
            query: async (path, q) => rows(await tx.get(query(db, path, q))),
            set: (path, data) => tx.set(db.doc(path), data),
            delete: path => tx.delete(db.doc(path))
        }));
    }
};
const gateway = createGateway({ store, auth: identity, chooseShard: () => `shard-${randomInt(1, 5)}`, newId: randomUUID });

// Hosting forwards same-origin /api requests here. Direct calls still require a
// verified master-project bearer token; no caller can select a different identity.
exports.collaborationApi = onRequest({ region: "asia-south1", maxInstances: 5, timeoutSeconds: 60, memory: "256MiB" }, createHttpHandler(identity, gateway));
