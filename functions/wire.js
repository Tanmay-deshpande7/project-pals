"use strict";
const { requireThat } = require("./policy");
const TAG = "__ppType";
function plain(o) { return o && typeof o === "object" && !Array.isArray(o) && !(o instanceof Date); }
function decode(v, depth = 0) {
    requireThat(depth <= 20, "Document too deeply nested", 400);
    if (v === null || typeof v === "boolean" || typeof v === "string") return v;
    if (typeof v === "number") { requireThat(Number.isFinite(v), "Invalid number", 400); return v; }
    if (Array.isArray(v)) { requireThat(v.length <= 200, "Array too large", 400); return v.map(x => decode(x, depth + 1)); }
    requireThat(plain(v), "Invalid value", 400);
    if (v[TAG] === "date") { const d = new Date(v.value); requireThat(typeof v.value === "string" && Number.isFinite(+d), "Invalid date", 400); return d; }
    if (v[TAG] === "timestamp") {
        requireThat(Number.isSafeInteger(v.seconds) && Number.isInteger(v.nanoseconds) && v.nanoseconds >= 0 && v.nanoseconds < 1000000000, "Invalid timestamp", 400);
        const d = new Date(v.seconds * 1000 + v.nanoseconds / 1000000);
        requireThat(Number.isFinite(+d), "Invalid timestamp", 400); return d;
    }
    if (v[TAG] === "transform") { requireThat(["arrayUnion", "arrayRemove", "increment", "serverTimestamp", "delete"].includes(v.name) && Array.isArray(v.values) && v.values.length <= 100, "Invalid transform", 400); return { [TAG]: "transform", name: v.name, values: v.values.map(x => decode(x, depth + 1)) }; }
    requireThat(!Object.hasOwn(v, TAG) && Object.keys(v).length <= 200, "Reserved or excessive fields", 400);
    const out = {};
    for (const [k, x] of Object.entries(v)) { requireThat(k.length <= 150 && !["__proto__", "prototype", "constructor"].includes(k) && !k.includes("."), "Invalid field name", 400); out[k] = decode(x, depth + 1); }
    return out;
}
function materialize(before, patch, merge, now) {
    const out = merge ? { ...(before || {}) } : {};
    for (const [k, v] of Object.entries(patch)) {
        if (plain(v) && v[TAG] === "transform") {
            const old = before?.[k];
            if (v.name === "delete") delete out[k];
            else if (v.name === "serverTimestamp") out[k] = now;
            else if (v.name === "increment") { requireThat(v.values.length === 1 && typeof v.values[0] === "number" && Number.isFinite(v.values[0]) && (old === undefined || typeof old === "number"), "Invalid increment", 400); out[k] = (old || 0) + v.values[0]; }
            else { requireThat(old === undefined || Array.isArray(old), "Invalid array transform", 400); const xs = old || []; out[k] = v.name === "arrayUnion" ? [...new Set([...xs, ...v.values])] : xs.filter(x => !v.values.includes(x)); }
        } else out[k] = v;
    }
    return out;
}
function encode(v) {
    if (v instanceof Date) return { [TAG]: "timestamp", seconds: Math.floor(+v / 1000), nanoseconds: (+v % 1000) * 1000000 };
    if (v && typeof v.toDate === "function") return { [TAG]: "timestamp", seconds: v.seconds, nanoseconds: v.nanoseconds };
    if (Array.isArray(v)) return v.map(encode);
    if (plain(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, encode(x)]));
    return v;
}
module.exports = { decode, encode, materialize };
