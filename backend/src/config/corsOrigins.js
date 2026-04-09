/**
 * Orígenes permitidos para CORS + cookies de sesión (credentials).
 * Prioridad: FRONTEND_ORIGIN y CORS_ORIGINS en .env (coma-separados) + lista por defecto dev.
 */

const DEFAULT_DEV_ORIGINS = [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4173',
    'http://127.0.0.1:4173',
    'http://localhost:8080',
    'http://127.0.0.1:8080'
];

function parseList(str) {
    if (!str || typeof str !== 'string') return [];
    return str
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
}

function getCorsAllowedOrigins() {
    const fromEnv = [
        ...parseList(process.env.FRONTEND_ORIGIN),
        ...parseList(process.env.CORS_ORIGINS)
    ];
    return [...new Set([...fromEnv, ...DEFAULT_DEV_ORIGINS])];
}

/** localhost / 127.0.0.1 con cualquier puerto (Live Server, etc.) */
const DEV_LOCAL_ORIGIN_RE = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

/** Callback compatible con el paquete `cors` */
function corsDynamicOrigin() {
    const allowed = getCorsAllowedOrigins();
    const isProd = process.env.NODE_ENV === 'production';
    return (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowed.includes(origin)) return callback(null, true);
        if (!isProd && DEV_LOCAL_ORIGIN_RE.test(origin)) return callback(null, true);
        callback(null, false);
    };
}

module.exports = { getCorsAllowedOrigins, corsDynamicOrigin, DEFAULT_DEV_ORIGINS };
