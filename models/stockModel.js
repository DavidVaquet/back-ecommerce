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
  fechaDesde,
  fechaHasta,
} = {}) => {
  let query = `
    SELECT sm.id,
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
     mov.display_name AS tipo
     FROM stock_movements AS sm
     JOIN users AS u ON sm.usuario_id = u.id
     JOIN products AS p ON sm.product_id = p.id
     JOIN movements_types AS mov ON sm.movements_type_id = mov.id
     WHERE 1=1
     `;

  const values = [];
  let i = 1;

  if (fechaDesde) {
  query += ` AND sm.created_at >= ($${i++}::date AT TIME ZONE 'America/Argentina/Buenos_Aires')`;
  values.push(fechaDesde);
}
if (fechaHasta) {
  query += ` AND sm.created_at <  (($${i++}::date + INTERVAL '1 day') AT TIME ZONE 'America/Argentina/Buenos_Aires')`;
  values.push(fechaHasta);
}

  query += ` ORDER BY sm.created_at DESC`;

  if (limite != undefined && limite != null) {
    const lim = Number(limite);
    if (Number.isInteger(lim) && lim > 0) {
      query += ` LIMIT $${i++}`;
      values.push(lim);
    }
  }

  const { rows } = await pool.query(query, values);

  return rows;
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