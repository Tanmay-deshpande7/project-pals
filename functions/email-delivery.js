"use strict";
const { createHash } = require("node:crypto");
const TYPES = new Set(["crew_request", "project_invite", "application_update", "chat"]);

// Only the backend may create notifications. Never accept an email address from
// the browser or an editable profile: Firebase Auth is the recipient authority.
function createEmailDelivery({ store, auth, config, fetchImpl = fetch, now = Date.now,
    sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) }) {
    return async function deliver({ uid, noticeId, notification }) {
        const settings = config();
        if (!settings.enabled) return { status: "disabled" };
        if (!settings.privateKey || !settings.publicKey || !settings.serviceId || !settings.templateId)
            throw new Error("Email delivery configuration is incomplete");
        if (![uid, noticeId].every(v => typeof v === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(v)))
            return { status: "invalid" };
        if (!notification || !TYPES.has(notification.type) ||
            typeof notification.title !== "string" || notification.title.length > 200 ||
            typeof notification.body !== "string" || notification.body.length > 2000)
            return { status: "invalid" };
        let recipient;
        try { recipient = await auth.getUser(uid); }
        catch (err) { if (err.code === "auth/user-not-found") return { status: "recipient-unavailable" }; throw err; }
        if (recipient.disabled || !recipient.emailVerified || !recipient.email)
            return { status: "recipient-unavailable" };

        const key = createHash("sha256").update(`${uid}/${noticeId}`).digest("hex");
        const deliveryPath = `emailDeliveries/${key}`, ratePath = "emailRateLimits/global";
        const recipientPath = `emailRateLimits/recipient-${createHash("sha256").update(uid).digest("hex")}`;
        const timestamp = now(), day = new Date(timestamp).toISOString().slice(0, 10);
        const month = day.slice(0, 7), hour = Math.floor(timestamp / 3600000);
        const limits = [settings.dailyLimit, settings.monthlyLimit, settings.recipientHourlyLimit];
        if (!limits.every(n => Number.isInteger(n) && n > 0)) throw new Error("Invalid email limits");
        const claim = await store.transaction("master", async t => {
            // Firestore transaction retries must never repeat an external send.
            const existing = await t.get(deliveryPath);
            if (existing) return { status: "duplicate" };
            const global = await t.get(ratePath) || {}, user = await t.get(recipientPath) || {};
            const daily = global.day === day ? global.daily || 0 : 0;
            const monthly = global.month === month ? global.monthly || 0 : 0;
            const hourly = user.hour === hour ? user.count || 0 : 0;
            const scheduledAt = Math.max(timestamp, global.nextAllowedAt || 0);
            // Bound both quota usage and waits. Suppression never affects in-app alerts.
            if (daily >= settings.dailyLimit || monthly >= settings.monthlyLimit ||
                hourly >= settings.recipientHourlyLimit || scheduledAt - timestamp > 30000) {
                t.set(deliveryPath, { status: "suppressed", createdAt: timestamp });
                return { status: "suppressed" };
            }
            t.set(ratePath, { day, month, daily: daily + 1, monthly: monthly + 1, nextAllowedAt: scheduledAt + 1100 });
            t.set(recipientPath, { hour, count: hourly + 1 });
            // Claim before the network request: repeated events cannot send twice.
            // A crash or ambiguous timeout may lose an email; do not blindly resend it.
            t.set(deliveryPath, { status: "attempting", createdAt: timestamp });
            return { status: "claimed", scheduledAt };
        });
        if (claim.status !== "claimed") return claim;
        const wait = claim.scheduledAt - now(); if (wait > 0) await sleep(wait);
        let status, providerStatus = null;
        try {
            const response = await fetchImpl("https://api.emailjs.com/api/v1.0/email/send", {
                method: "POST", headers: { "Content-Type": "application/json" },
                signal: AbortSignal.timeout(10000),
                body: JSON.stringify({ service_id: settings.serviceId, template_id: settings.templateId,
                    user_id: settings.publicKey, accessToken: settings.privateKey,
                    template_params: { to_email: recipient.email, title: notification.title,
                        body: notification.body, type: notification.type } })
            });
            providerStatus = response.status; status = response.ok ? "sent" : "rejected";
            // Never log provider response text, recipient addresses, or credentials.
            if (response.body?.cancel) await response.body.cancel().catch(() => {});
        } catch { status = "uncertain"; }
        await store.set("master", deliveryPath, { status, providerStatus, createdAt: timestamp, finishedAt: now() });
        return { status };
    };
}
module.exports = { createEmailDelivery };
