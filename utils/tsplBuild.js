export function buildEtiquetaTSPL(producto, ancho = 60, alto = 30, copias = 1) {
  const nombre = (producto?.nombre || '').toUpperCase();
  const codigo = producto?.barcode || producto?.codigo || '';
  const precio = producto?.precio != null ? `$${Number(producto.precio).toFixed(2)}` : '';

  const tspl = [
    `SIZE ${ancho} mm,${alto} mm`,
    'GAP 3 mm,0 mm',
    'CLS',

    // --- NOMBRE DEL PRODUCTO (centrado y grande) ---
    // Fuente 4 más visible, más grande y centrado verticalmente en el tercio superior
    `TEXT 100,20,"4",0,1.5,1.5,"${nombre}"`,

    // --- CÓDIGO DE BARRAS (ancho, centrado) ---
    // Tipo 128, altura 70, centrado aproximadamente, sin texto visible debajo (readable=0)
    `BARCODE 120,70,"128",70,1,0,2,4,"${codigo}"`,

    // --- PRECIO (debajo del código, centrado) ---
    // Fuente 3, tamaño medio
    `TEXT 150,180,"3",0,1,1,"${precio}"`,

    `PRINT ${copias}`
  ].join('\n') + '\n';

  return tspl;
}