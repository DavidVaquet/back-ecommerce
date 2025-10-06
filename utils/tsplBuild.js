export function buildEtiquetaTSPL(producto, ancho = 60, alto = 30, copias = 1) {
  const nombre = (producto?.nombre || '').toUpperCase();
  const codigo = producto?.barcode || producto?.codigo || '';
  const precio = producto?.precio != null ? `$${Number(producto.precio).toFixed(2)}` : '';

  const tspl = [
    `SIZE ${ancho} mm,${alto} mm`,
    'GAP 3 mm,0 mm',
    'CLS',
    'TEXT 60,30,"4",0,1,1,"' + nombre + '"',
    'BARCODE 30,70,"128",80,1,0,2,3,"' + codigo + '"',
    'TEXT 100,170,"3",0,1,1,"' + precio + '"',
    `PRINT ${copias}`
  ].join('\n') + '\n';

  return tspl;
}