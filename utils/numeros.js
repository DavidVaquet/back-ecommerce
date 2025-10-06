export const toNumber = (v, def = null) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

export const formatearPesos = (numero) => {
    return parseFloat(numero).toLocaleString('es-AR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})    
}