export const toNumber = (v, def = null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};