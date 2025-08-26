import pool from "../config/db.js";

function buildDateRange(periodo) {
  const end = new Date();      // ahora
  const start = new Date(end);
  switch (periodo) {
    case "7d":  start.setDate(end.getDate() - 7); break;
    case "30d": start.setDate(end.getDate() - 30); break;
    case "3m":  start.setMonth(end.getMonth() - 3); break;
    case "1y":  start.setFullYear(end.getFullYear() - 1); break;
    default:    start.setDate(end.getDate() - 30);
  }
  return { start, end };
}

function buildPrevRange(start, end) {
  const delta = end.getTime() - start.getTime();
  const prevStart = new Date(start.getTime() - delta);
  const prevEnd   = new Date(start.getTime()); // [prevStart, prevEnd)
  return { prevStart, prevEnd };
}

const kpisSQL = `WITH
-- [A] Base productos + stock (estado actual)
base AS (
  SELECT
    p.id,
    p.precio,
    p.precio_costo,
    COALESCE(st.cantidad, 0)        AS cant,
    COALESCE(st.cantidad_minima, 0) AS min_cant
  FROM products p
  LEFT JOIN stock st        ON st.product_id   = p.id
  JOIN subcategories sb     ON sb.id           = p.subcategoria_id
  JOIN categories c         ON c.id            = sb.categoria_id
  WHERE p.estado = 1
    AND ($3::int IS NULL OR c.id = $3)
),

-- [B] Ventas dentro del período seleccionado [start, end)
ventas_periodo AS (
  SELECT COALESCE(SUM(vt.subtotal), 0) AS total
  FROM ventas_detalle vt
  JOIN ventas v         ON v.id  = vt.venta_id
  JOIN products p       ON p.id  = vt.producto_id
  JOIN subcategories sb ON sb.id = p.subcategoria_id
  JOIN categories c     ON c.id  = sb.categoria_id
  WHERE v.fecha >= $1 AND v.fecha < $2
    AND p.estado = 1
    AND ($3::int IS NULL OR c.id = $3)
),

-- [C] Ventas del período anterior [prevStart, prevEnd)
ventas_periodo_anterior AS (
  SELECT COALESCE(SUM(vt.subtotal), 0) AS total
  FROM ventas_detalle vt
  JOIN ventas v         ON v.id  = vt.venta_id
  JOIN products p       ON p.id  = vt.producto_id
  JOIN subcategories sb ON sb.id = p.subcategoria_id
  JOIN categories c     ON c.id  = sb.categoria_id
  WHERE v.fecha >= $4 AND v.fecha < $5
    AND p.estado = 1
    AND ($3::int IS NULL OR c.id = $3)
)

-- [D] KPIs finales (agregado global)
SELECT
  -- Valor de inventario a HOY: stock * costo (si costo=0 → usa precio)
  COALESCE(
    SUM(base.cant * COALESCE(NULLIF(base.precio_costo, 0), base.precio, 0)),
    0
  )::numeric(12,2) AS valor_total_inventario,

  -- Productos con stock por debajo del mínimo (pero > 0)
  COUNT(*) FILTER (WHERE base.cant > 0 AND base.cant < base.min_cant) AS productos_bajo_stock,

  -- Productos sin stock
  COUNT(*) FILTER (WHERE base.cant = 0) AS productos_sin_stock,

  -- Total de productos activos (ya filtrados en base)
  COUNT(*) AS total_productos,

  -- Ventas del período actual
  (SELECT total FROM ventas_periodo) AS ventas_periodo,

  -- Variación % vs período anterior
  CASE
    WHEN (SELECT total FROM ventas_periodo_anterior) = 0 THEN 0
    ELSE ROUND(
      (
        (SELECT total FROM ventas_periodo) - (SELECT total FROM ventas_periodo_anterior)
      ) / NULLIF((SELECT total FROM ventas_periodo_anterior), 0) * 100
    , 2)
  END AS variacion_periodo
FROM base;
`;
const topSQL  = `SELECT
  -- Identidad
  p.id,
  p.nombre,
  c.nombre AS categoria,

  -- Ventas en el período
  SUM(vt.cantidad) AS unidades_vendidas,
  SUM(vt.subtotal) AS ingresos,

  -- Inventario a hoy
  COALESCE(st.cantidad, 0) AS stock_actual,
  ROUND(
    COALESCE(st.cantidad, 0) * COALESCE(NULLIF(p.precio_costo, 0), p.precio, 0),
    2
  ) AS valor_stock

FROM products p
JOIN subcategories sb ON sb.id = p.subcategoria_id
JOIN categories c     ON c.id  = sb.categoria_id
LEFT JOIN stock st    ON st.product_id = p.id
JOIN ventas_detalle vt ON vt.producto_id = p.id
JOIN ventas v          ON v.id = vt.venta_id

WHERE
  v.fecha >= $1 AND v.fecha < $2
  AND p.estado = 1
  AND ($3::int IS NULL OR c.id = $3)

GROUP BY
  p.id, p.nombre, c.nombre, st.cantidad, p.precio_costo, p.precio

ORDER BY
  SUM(vt.cantidad) DESC,         -- Top por unidades
  SUM(vt.subtotal) DESC,         -- Desempate por ingresos
  p.nombre ASC

LIMIT COALESCE($4::int, 10);
`;
const critSQL = `SELECT
  p.id,
  p.nombre,
  c.nombre AS categoria,
  COALESCE(st.cantidad, 0)        AS stock_actual,
  COALESCE(st.cantidad_minima, 0) AS stock_minimo,
  COALESCE( (CURRENT_DATE - MAX(v.fecha)::date), 999) AS dias_sin_venta,
  CASE
    WHEN COALESCE(st.cantidad,0) = 0 THEN 'sin_stock'
    WHEN COALESCE(st.cantidad,0) < COALESCE(st.cantidad_minima,0) THEN 'bajo_stock'
    ELSE 'critico'
  END AS estado
FROM products p
JOIN subcategories sb ON sb.id = p.subcategoria_id
JOIN categories c     ON c.id  = sb.categoria_id
LEFT JOIN stock st         ON st.product_id = p.id
LEFT JOIN ventas_detalle vt ON vt.producto_id = p.id
LEFT JOIN ventas v          ON v.id = vt.venta_id
WHERE p.estado = 1
  AND ($1::int IS NULL OR c.id = $1)
GROUP BY p.id, p.nombre, c.nombre, st.cantidad, st.cantidad_minima
HAVING COALESCE(st.cantidad,0) = 0
    OR COALESCE(st.cantidad,0) < COALESCE(st.cantidad_minima,0)
ORDER BY stock_actual ASC, dias_sin_venta DESC
LIMIT COALESCE($2::int, 20);
`;
const catSQL  = `SELECT
  c.nombre AS categoria,
  COALESCE(SUM(vt.subtotal), 0) AS ingresos,
  COALESCE(SUM(vt.cantidad), 0) AS unidades,
  COUNT(DISTINCT v.id)          AS ordenes,
  COUNT(DISTINCT p.id)          AS productos
FROM categories c
JOIN subcategories sb ON sb.categoria_id = c.id
JOIN products p       ON p.subcategoria_id = sb.id AND p.estado = 1
LEFT JOIN ventas_detalle vt ON vt.producto_id = p.id
LEFT JOIN ventas v          ON v.id = vt.venta_id
  AND v.fecha >= $1 AND v.fecha < $2
WHERE ($3::int IS NULL OR c.id = $3)   -- <<< asegúrate de tener ESTO
GROUP BY c.nombre
ORDER BY ingresos DESC;`;

const rotSQL = `WITH
unidades AS (
  SELECT COALESCE(SUM(vt.cantidad),0) AS total_unidades
  FROM ventas_detalle vt
  JOIN ventas v ON v.id = vt.venta_id
  WHERE v.fecha >= $1 AND v.fecha < $2
),
stock_final AS (
  SELECT COALESCE(SUM(s.cantidad),0) AS total FROM stock s
),
mov_periodo AS (
  SELECT COALESCE(SUM(
    CASE
      WHEN sm.movements_type_id IN (1) THEN sm.cantidad
      WHEN sm.movements_type_id IN (-1) THEN -sm.cantidad
      ELSE 0
    END
  ),0) AS delta
  FROM stock_movements sm
  WHERE sm.fecha >= $1 AND sm.fecha < $2
),
stock_inicial AS (
  SELECT (sf.total - mp.delta) AS total
  FROM stock_final sf, mov_periodo mp
)
SELECT
  u.total_unidades,
  si.total AS stock_inicial,
  sf.total AS stock_final,
  ROUND(
    (u.total_unidades)::numeric /
    NULLIF(((si.total + sf.total)/2.0), 0)::numeric
  ,2) AS rotacion_promedio
FROM unidades u, stock_inicial si, stock_final sf;
`

export async function getEstadisticasGlobales({
  periodo = "30d",
  categoryId = null,
  topLimit = 10,
  criticosLimit = 20,
} = {}) {
  const { start, end } = buildDateRange(periodo);
  const { prevStart, prevEnd } = buildPrevRange(start, end);

  const kpisParams = [start, end, categoryId, prevStart, prevEnd];
  const topParams  = [start, end, categoryId, topLimit];
  const critParams = [categoryId, criticosLimit];
  const catParams  = [start, end, categoryId];
  const promParams = [start, end];

  const [kpisRes, topRes, critRes, catRes, promRes] = await Promise.all([
    pool.query(kpisSQL, kpisParams),
    pool.query(topSQL,  topParams),
    pool.query(critSQL, critParams),
    pool.query(catSQL,  catParams),   
    pool.query(rotSQL,  promParams),  
  ]);

  const toNum0 = (x) => Number(x ?? 0);

 
  const KPIS = kpisRes.rows?.[0] || {};
  const ROT  = promRes.rows?.[0] || {};

 
  const categoriasRaw = Array.isArray(catRes.rows) ? catRes.rows : [];
  let ventas_por_categoria = categoriasRaw.map((r) => ({
    categoria: r.categoria,
    ingresos:  toNum0(r.ingresos),   
    unidades:  Number(r.unidades ?? 0),  
    ordenes:   Number(r.ordenes ?? 0),    
    productos: Number(r.productos ?? 0),  
  }));
  const totalIngresos = ventas_por_categoria.reduce((acc, x) => acc + (x.ingresos || 0), 0);
  ventas_por_categoria = ventas_por_categoria.map((x) => ({
    ...x,
    porcentaje: totalIngresos ? Number(((x.ingresos / totalIngresos) * 100).toFixed(2)) : 0,
  }));

  return {
    metricas_principales: {
      valor_total_inventario: toNum0(KPIS.valor_total_inventario),
      productos_bajo_stock:   Number(KPIS.productos_bajo_stock ?? 0),
      productos_sin_stock:    Number(KPIS.productos_sin_stock ?? 0),
      total_productos:        Number(KPIS.total_productos ?? 0),
      ventas_periodo:         toNum0(KPIS.ventas_periodo),
      variacion_periodo:      toNum0(KPIS.variacion_periodo),
      rotacion_promedio:      toNum0(ROT.rotacion_promedio),
    },

    productos_top: (topRes.rows ?? []).map((r) => ({
      id: r.id,
      nombre: r.nombre,
      categoria: r.categoria,
      ventas_mes: toNum0(r.ingresos),       
      stock_actual: Number(r.stock_actual ?? 0),
      valor_stock: toNum0(r.valor_stock),
      unidades_vendidas: Number(r.unidades_vendidas ?? 0),
    })),

    productos_criticos: (critRes.rows ?? []).map((r) => ({
      id: r.id,
      nombre: r.nombre,
      categoria: r.categoria,
      stock_actual: Number(r.stock_actual ?? 0),
      stock_minimo: Number(r.stock_minimo ?? 0),
      dias_sin_venta: r.dias_sin_venta == null ? null : Number(r.dias_sin_venta),
      estado: r.estado,
    })),

    ventas_por_categoria,
  };
}