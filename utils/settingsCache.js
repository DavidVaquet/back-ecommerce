const TTL_MS = 60_000;
const memory = new Map();

export const getSettingsFromCache = (orgId) => {
    const entry = memory.get(orgId);
    const now = Date.now();
    if (entry && entry.exp > now) return entry.data;
    if (entry && entry.exp <= now) memory.delete(orgId);
    return null;
}

export const setSettingsCache = (orgId, data, ttl = TTL_MS) => {
    memory.set(orgId, { data, exp: Date.now() + ttl});
}

export const invalidateSettingsCache = (orgId) => {
    memory.delete(orgId);
}

export function clearAllSettingsCache() {
  memory.clear();
}