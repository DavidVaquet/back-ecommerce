export function buildTSPLMinimal({
  width_mm,
  height_mm,
  copies,
  producto
}) {
 
  const gap_mm   = 3;
  const density  = 8;  
  const speed    = 4;   
  const direction= 1;   


  const x1 = 40, y1 = 40;     // nombre
  const x2 = 40, y2 = 90;     // SKU
  const x3 = 40, y3 = 130;    // precio
  const xBar = 40, yBar = 170; // barcode

  const nombre  = (producto?.nombre ?? '').toString().slice(0, 28);
  const sku     = (producto?.cantidad ?? '').toString().slice(0, 20);
  const barcode = (producto?.barcode ?? '').toString();
  const precio  = producto?.precio != null ? Number(producto.precio) : null;
  const moneda  = (producto?.currency ?? 'ARS').toUpperCase();

  const lines = [
    `SIZE ${width_mm} mm,${height_mm} mm`,
    `GAP ${gap_mm} mm,0 mm`,
    `DENSITY ${density}`,
    `SPEED ${speed}`,
    `DIRECTION ${direction}`,
    `CLS`,
    `TEXT ${x1},${y1},"3",0,1,1,"${san(nombre)}"`,
    `TEXT ${x2},${y2},"3",0,1,1,"Cant: ${san(sku)}"`,
  ];

  if (precio != null && !Number.isNaN(precio)) {
    lines.push(`TEXT ${x3},${y3},"3",0,1,1,"${formatMoney(precio, moneda)}"`);
  }

  if (barcode) {
    lines.push(`BARCODE 128 ${xBar},${yBar},120,1,0,2,2,"${san(barcode)}"`);
    lines.push(`TEXT ${xBar},${yBar + 130},"3",0,1,1,"${san(barcode)}"`);
  }

  lines.push(`PRINT ${copies}`);

  return {
    tspl: lines.join('\n') + '\n',
    defaults: { gap_mm, density, speed, direction }
  };
}

function san(str = '') {
  return String(str).replace(/"/g, '\\"');
}

function formatMoney(value, currency = 'ARS') {
  try {
    return new Intl.NumberFormat('es-AR', { style: 'currency', currency }).format(value);
  } catch {
    return `${value} ${currency}`;
  }
}