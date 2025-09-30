import pool from "../config/db.js";
import { parseAndNormalize } from "../utils/date.js";

export const crearVenta = async ({client, canal, medio_pago, total, cliente_id, usuarioId, descuento, subtotal, impuestos, currency, descuento_porcentaje, impuestos_porcentaje}) => {

    const query = `INSERT INTO ventas (canal, medio_pago, total, cliente_id, usuario_id, descuento, subtotal, impuestos, currency, descuento_porcentaje, impuestos_porcentaje) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *;`
    const values = [canal, medio_pago, total, cliente_id, usuarioId, descuento, subtotal, impuestos, currency, descuento_porcentaje, impuestos_porcentaje];

    const result = await client.query(query, values);
    const ventaId = result.rows[0].id;

    const fecha = result.rows[0].fecha || new Date();
    const año = fecha.getFullYear();
    const canalLower = canal.toLowerCase();
    const prefijo = canalLower === "local" ? 'VTA' : "ECM";
    const codigo = `${prefijo}-${año}-${String(ventaId).padStart(3, '0')}`;
    const document = `${prefijo}-${ventaId}`;
    const orden = `ORD-${año}-${String(ventaId).padStart(3, '0')}`;

    await client.query(`UPDATE ventas SET codigo = $1, orden = $2 WHERE id = $3`, [codigo, orden, ventaId]);
    return { ventaId, document };
};

export const getVentasConDetalles = async ({
  search, fecha_desde, fecha_fin, limit, offset, origen
    } = {}) => {

  let fromParam = null, toParam = null;
  if (fecha_desde && fecha_fin) {
    const { fromUTC, toUTC } = parseAndNormalize(fecha_desde, fecha_fin);
    fromParam = fromUTC;
    toParam   = toUTC;
  }

  const where = [];
  const params = [];
  let i = 1;

  if (fromParam) { where.push(`v.fecha_utc >= $${i++}::timestamptz`); params.push(fromParam); }
  if (toParam)   { where.push(`v.fecha_utc <= $${i++}::timestamptz`); params.push(toParam); }

  const q = (search ?? '').trim();
  if (q) {
    where.push(`
      (
        unaccent(lower(v.codigo))    LIKE unaccent(lower('%' || $${i} || '%'))
        OR unaccent(lower(c.nombre)) LIKE unaccent(lower('%' || $${i} || '%'))
        OR unaccent(lower(u.nombre)) LIKE unaccent(lower('%' || $${i} || '%'))
        OR EXISTS (
          SELECT 1
          FROM ventas_detalle vd
          JOIN products p ON p.id = vd.producto_id
          WHERE vd.venta_id = v.id
            AND unaccent(lower(p.nombre)) LIKE unaccent(lower('%' || $${i} || '%'))
        )
      )
    `);
    params.push(q);
    i++;
  }

  if (origen) {
    const origenParsed = origen.toLowerCase().trim();
    where.push(`v.canal = $${i++}`);
    params.push(origenParsed);
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

  const lim = Math.min(Math.max(+limit || 20, 1), 100);
  const off = Math.max(+offset || 0, 0);

  const sql = `
    WITH filtradas AS (
      SELECT v.id
      FROM ventas v
      JOIN clientes c ON v.cliente_id = c.id
      JOIN users    u ON v.usuario_id = u.id
      ${whereSql}
      ORDER BY v.id DESC
    ),
    total_rows AS (SELECT COUNT(*)::bigint AS total FROM filtradas),
    page AS (
      SELECT id FROM filtradas
      LIMIT $${i++} OFFSET $${i++}
    )
    SELECT
      v.id, v.codigo, v.total, v.fecha, v.canal, v.medio_pago, v.descuento, v.impuestos, v.subtotal, v.orden, v.descuento_porcentaje, v.impuestos_porcentaje,
      c.nombre AS cliente_nombre, c.apellido AS cliente_apellido, c.email AS cliente_email, c.telefono AS cliente_telefono,
      u.nombre AS usuario_nombre,
      json_agg(
        json_build_object(
          'id', vt.producto_id, 'nombre', p.nombre, 'precio', vt.precio_unitario,
          'cantidad', vt.cantidad, 'imagen', p.imagen_url
        ) ORDER BY vt.id
      ) AS productos,
      (SELECT total FROM total_rows) AS total_filtrado
    FROM page pg
    JOIN ventas v          ON v.id = pg.id
    JOIN clientes c        ON v.cliente_id = c.id
    JOIN users u           ON v.usuario_id = u.id
    JOIN ventas_detalle vt ON vt.venta_id = v.id
    JOIN products p        ON p.id = vt.producto_id
    GROUP BY
      v.id, v.codigo, v.total, v.fecha, v.canal, v.medio_pago, v.descuento, v.impuestos, v.subtotal, v.orden, v.descuento_porcentaje, v.impuestos_porcentaje,
      c.nombre, c.apellido, c.email, c.telefono, u.nombre
    ORDER BY v.id DESC;
  `;

  params.push(lim, off);

  const { rows } = await pool.query(sql, params);

  const total = rows[0]?.total_filtrado ? Number(rows[0].total_filtrado) : 0;
  const ventas = rows.map(f => ({
    id: f.id,
    codigo: f.codigo,
    total: Number(f.total),
    fecha: f.fecha,
    canal: f.canal,
    medio_pago: f.medio_pago,
    descuento: Number(f.descuento),
    impuestos: Number(f.impuestos),
    subtotal: Number(f.subtotal),
    descuento_porcentaje: Number(f.descuento_porcentaje),
    impuesto_porcentaje: Number(f.impuestos_porcentaje),
    orden: f.orden,
    cliente: { nombre: f.cliente_nombre, apellido: f.cliente_apellido, email: f.cliente_email, telefono: f.cliente_telefono },
    usuario: { nombre: f.usuario_nombre },
    productos: (f.productos || []).map(p => ({ id: p.id, nombre: p.nombre, precio: Number(p.precio), cantidad: p.cantidad, imagen: p.imagen })),
  }));

  return { ventas, total, limit: lim, offset: off };
};

export const getVentasEstadisticas = async () => {

    const sql = `
    SELECT
    COUNT(*)::bigint                                   AS total_ventas,
    COUNT(*) FILTER (WHERE v.canal = 'local')::bigint  AS total_ventas_local,
    COUNT(*) FILTER (WHERE v.canal = 'online')::bigint AS total_ventas_online,
    COALESCE(SUM(v.total), 0)::numeric(20,2)                                   AS ingresos_totales,
    COALESCE(SUM(v.total) FILTER (WHERE v.canal = 'local'), 0)::numeric(20,2)  AS ingresos_local,
    COALESCE(SUM(v.total) FILTER (WHERE v.canal = 'online'), 0)::numeric(20,2) AS ingresos_online
    FROM ventas v;

    `;

    const { rows: [r] } = await pool.query(sql);

    const out = {
    total_ventas: Number(r.total_ventas),           
    total_ventas_local: Number(r.total_ventas_local),
    total_ventas_online: Number(r.total_ventas_online),

    
    ingresos_totales: Number(r.ingresos_totales),     
    ingresos_local: Number(r.ingresos_local),
    ingresos_online: Number(r.ingresos_online),
    };

    return out;
} 

