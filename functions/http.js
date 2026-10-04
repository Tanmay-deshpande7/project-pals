"use strict";
const { PolicyError } = require("./policy");

// Authenticate at the HTTP boundary before any data operation is dispatched.
function createHttpHandler(identity, gateway, log = console) {
    return async (req, res) => {
        res.set("Cache-Control", "no-store"); res.set("X-Content-Type-Options", "nosniff");
        if (req.method !== "POST") { res.status(405).json({ error: "POST required" }); return; }
        if (!req.is("application/json") || !req.rawBody || req.rawBody.length > 1024 * 1024) { res.status(400).json({ error: "A bounded JSON body is required" }); return; }
        const match = /^Bearer ([A-Za-z0-9_.-]+)$/.exec(req.get("Authorization") || "");
        if (!match) { res.status(401).json({ error: "Sign in required" }); return; }
        try {
            const token = await identity.verifyIdToken(match[1], true);
            res.json({ result: await gateway.dispatch(token.uid, req.body) });
        } catch (err) {
            if (err instanceof PolicyError) res.status(err.status).json({ error: err.message });
            else if (String(err.code || "").startsWith("auth/")) res.status(401).json({ error: "Sign in again to continue" });
            else { log.error("Collaboration request failed", { code: err.code || "internal" }); res.status(503).json({ error: "Service unavailable; retry shortly" }); }
        }
    };
}
module.exports = { createHttpHandler };
