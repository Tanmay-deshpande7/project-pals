const base = require('../tailwind.config');
module.exports = { ...base, theme: { ...base.theme, extend: { ...base.theme.extend, colors: { ...base.theme.extend.colors,
    // Preserve the admin palette when replacing the runtime Tailwind CDN.
    primary: '#3b82f6', secondary: '#8b5cf6', accent: '#ec4899', background: '#0f172a', surface: '#1e293b', main: '#f8fafc', muted: '#94a3b8'
} } } };
