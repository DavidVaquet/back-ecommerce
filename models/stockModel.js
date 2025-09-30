import pool from "../config/db.js";

export const getStockProductIdForUpdate = async (client, product_id) => {
  const { rows } = await client.query(
    `
        SELECT id, product_id, cantidad, cantidad_minima
        FROM stock
        WHERE product_id = $1
        FOR UPDATE`,
    [product_id]
  );

  return rows[0];
};

export const ensureStockRow = async (
  client,
  { product_id, cantidad = 0, cantidad_minima = 0 }
) => {
  const { rows } = await client.query(
    `
    INSERT INTO stock (product_id, cantidad, cantidad_minima)
    VALUES ($1, $2, $3)
    ON CONFLICT (product_id) DO UPDATE
      SET cantidad_minima = EXCLUDED.cantidad_minima,
          update_at = now()
    RETURNING id, product_id, cantidad, cantidad_minima
  `,
    [product_id, cantidad, cantidad_minima]
  );

  return rows[0];
};

export const applyStockDelta = async (client, product_id, delta) => {
  const { rows } = await client.query(
    `
        UPDATE stock
        SET cantidad = cantidad + $2,
        update_at = now()
        WHERE product_id = $1
        RETURNING product_id, cantidad`,
    [product_id, delta]
  );

  return rows[0];
};

export const addStockMovement = async (
  client,
  {
    product_id,
    movements_type_id,
    cantidad,
    direction,
    stock_anterior,
    stock_actual,
    usuario_id,
    motivo,
    document,
    costo_unitario,
    metadata,
    precio_venta,
    cliente,
  }
) => {
  const { rows } = await client.query(
    `
            INSERT INTO stock_movements
            (
             product_id, 
             movements_type_id,
             fecha,
             cantidad,
             direction,
             stock_anterior,
             stock_actual,
             usuario_id,
             motivo,
             document,
             costo_unitario,
             metadata,
             precio_venta,
             cliente
             )
             VALUES ($1, $2, now(), $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
             RETURNING id, fecha;`,
    [
      product_id,
      movements_type_id,
      cantidad,
      direction,
      stock_anterior,
      stock_actual,
      usuario_id,
      motivo ?? null,
      document ?? null,
      costo_unitario ?? null,
      metadata ?? null,
      precio_venta,
      cliente,
    ]
  );

  return rows[0];
};

export const movementType = async (client, codigo) => {
  const { rows } = await client.query(
    `
        SELECT id, direction
        FROM movements_types
        WHERE codigo = $1 AND is_active = TRUE
        LIMIT 1`,
    [codigo]
  );

  return rows[0];
};

export const getMovementsType = async () => {
  const { rows } = await pool.query(`
        SELECT * FROM movements_types
        WHERE is_active = TRUE`);

  return rows;
};

export const getAllMovementStock = async ({
  limite,
  offset,
  fechaDesde,
  fechaHasta,
  search,
  tipo,
} = {}) => {
  const values = [];
  let i = 1;

  
  const where = [];

  if (fechaDesde) {
    where.push(`sm.created_at >= ($${i++}::date AT TIME ZONE 'America/Argentina/Buenos_Aires')`);
    values.push(fechaDesde);
  }
  if (fechaHasta) {
    where.push(`sm.created_at < (($${i++}::date + INTERVAL '1 day') AT TIME ZONE 'America/Argentina/Buenos_Aires')`);
    values.push(fechaHasta);
  }
  if (search && search.trim().length >= 3) {
    where.push(`
      (
        unaccent(lower(p.nombre))  LIKE unaccent(lower('%' || $${i} || '%'))
        OR unaccent(lower(p.barcode)) LIKE unaccent(lower('%' || $${i} || '%'))
      )
    `);
    values.push(search.trim());
    i++;
  }
  if (tipo != null && String(tipo).trim() !== '') {
    where.push(`lower(mov.codigo) = lower($${i++})`);
    values.push(String(tipo).trim());
  }

  const lim = Number.isFinite(+limite) && +limite > 0 ? Math.min(+limite, 100) : 25;
  const off = Number.isFinite(+offset) && +offset >= 0 ? +offset : 0;

  const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const sql = `
    WITH filtradas AS (
      SELECT sm.id
      FROM stock_movements sm
      JOIN users u     ON sm.usuario_id = u.id
      JOIN products p  ON sm.product_id = p.id
      JOIN movements_types mov ON sm.movements_type_id = mov.id
      ${whereSQL}
      ORDER BY sm.created_at DESC
    ),
    total_rows AS (
      SELECT COUNT(*)::bigint AS total FROM filtradas
    ),
    page AS (
      SELECT id FROM filtradas
      LIMIT $${i++} OFFSET $${i++}
    )
    SELECT
      sm.id,
      sm.product_id,
      sm.fecha AS fecha_creacion,
      sm.cantidad AS cantidad_movimiento,
      sm.direction,
      sm.stock_anterior,
      sm.stock_actual,
      sm.usuario_id,
      sm.motivo,
      sm.document,
      sm.costo_unitario,
      sm.metadata,
      sm.created_at,
      sm.movements_type_id,
      sm.precio_venta,
      sm.cliente,
      u.nombre AS usuario_nombre,
      p.nombre AS producto_nombre,
      p.barcode,
      mov.display_name AS tipo,
      mov.codigo AS codigo_tipo,
      (SELECT total FROM total_rows) AS total_filtrado
    FROM page pg
    JOIN stock_movements sm ON sm.id = pg.id
    JOIN users u     ON sm.usuario_id = u.id
    JOIN products p  ON sm.product_id = p.id
    JOIN movements_types mov ON sm.movements_type_id = mov.id
    ORDER BY sm.created_at DESC;
  `;

  values.push(lim, off);

  const { rows } = await pool.query(sql, values);

  const total = rows[0]?.total_filtrado ? Number(rows[0].total_filtrado) : 0;
  return {
    items: rows, 
    total,
    limit: Number(limite),
    offset: Number(offset),
  };
};
export const todayStockMovementEstadisticas = async ({ hoy } = {}) => {

    const today = hoy ?? new Date().toISOString().slice(0, 10);

    const query = `
    SELECT
    COUNT(*) as total_movimientos,
    COUNT(*) FILTER (WHERE sm.direction = 1 AND mov.display_name <> 'Ajuste') as entradas_count,
    COUNT(*) FILTER (WHERE sm.direction = -1 AND mov.display_name <> 'Ajuste') as salidas_count,
    COUNT(*) FILTER (WHERE mov.display_name = 'Ajuste') as ajustes_count,
    COALESCE(SUM(sm.cantidad * sm.costo_unitario) FILTER (WHERE sm.direction = 1 AND mov.display_name <> 'Ajuste'), 0) as entradas_valor_costo,
    COALESCE(SUM(sm.cantidad * sm.costo_unitario) FILTER (WHERE sm.direction = -1 AND mov.display_name <> 'Ajuste'), 0) as salidas_valor_costo
    FROM stock_movements as sm
    JOIN movements_types as mov ON sm.movements_type_id = mov.id
    WHERE sm.created_at >= ($1::date AT TIME ZONE 'America/Argentina/Buenos_Aires')
    AND sm.created_at < (($1::date + INTERVAL '1 day') AT TIME ZONE 'America/Argentina/Buenos_Aires');
    `;

    const values = [today];
    const { rows } = await pool.query(query, values);

    return rows[0];
}