import pool from "../config/db.js";

export const altaCliente = async ({
  nombre,
  apellido,
  email,
  telefono,
  fecha_nacimiento,
  tipo_cliente,
  es_vip,
  direccion,
  ciudad,
  pais,
  codigo_postal,
  notas,
  activo = true,
}) => {
  const query = `INSERT INTO clientes 
        (nombre, apellido, email, telefono, fecha_nacimiento, tipo_cliente, es_vip, direccion, ciudad, pais, codigo_postal, notas, activo) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *;`;
  const values = [
    nombre,
    apellido,
    email,
    telefono,
    fecha_nacimiento,
    tipo_cliente,
    es_vip,
    direccion,
    ciudad,
    pais,
    codigo_postal,
    notas,
    activo,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
};

export const buscarCliente = async (email) => {
  const query = `SELECT * FROM clientes WHERE email = $1;`;
  const values = [email];

  const result = await pool.query(query, values);

  return result.rows[0];
};

export const getClientesEstado = async ({
  activo,
  limite,
  offset,
  search,
  origen,
}) => {
  const values = [];
  const conditions = [];
  let i = 1;

  if (activo != null) {
    conditions.push(`c.activo = $${i++}`);
    values.push(activo);
  }

  if (origen != null) {
    conditions.push(`c.origen = $${i++}`);
    values.push(origen);
  }

  const s = typeof search === "string" ? search.trim() : "";
  if (s && s.length >= 3) {
    conditions.push(`(
      unaccent(lower(c.nombre))        LIKE unaccent(lower('%' || $${i} || '%')) OR
      unaccent(lower(c.apellido))      LIKE unaccent(lower('%' || $${i} || '%')) OR
      unaccent(lower(c.tipo_cliente))  LIKE unaccent(lower('%' || $${i} || '%')) OR
      unaccent(lower(c.ciudad))        LIKE unaccent(lower('%' || $${i} || '%')) OR
      unaccent(lower(c.email))         LIKE unaccent(lower('%' || $${i} || '%'))
    )`);
    values.push(s);
    i++;
  }

  const whereSQL = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const lim = Number.isFinite(+limite) && +limite > 0 ? +limite : 25;
  const off = Number.isFinite(+offset) && +offset >= 0 ? +offset : 0;

  const sql = `
    SELECT
      c.*,
      COUNT(*) OVER ()::bigint AS total_rows
    FROM clientes c
    ${whereSQL}
    ORDER BY c.id DESC
    LIMIT $${i++} OFFSET $${i++}
  `;

  values.push(lim, off);

  const { rows } = await pool.query(sql, values);
  const total = rows[0]?.total_rows ? Number(rows[0].total_rows) : 0;

  return { items: rows, total, limit: lim, offset: off };
};

export const obtenerClientesCompras = async ({
  activo,
  origen,
  search,
  limite,
  offset,
  tipo_cliente
} = {}) => {
  const values = [];
  const conditions = [];
  let i = 1;

  if (activo != null) {
    conditions.push(`c.activo = $${i++}`);
    values.push(activo);
  }
  if (origen != null) {
    conditions.push(`c.origen = $${i++}`);
    values.push(origen);
  }

  if (tipo_cliente != null) {
    conditions.push(`c.tipo_cliente = $${i++}`);
    values.push(tipo_cliente);
  }

  const s = typeof search === 'string' ? search.trim() : '';
  if (s && s.length >= 3) {
    conditions.push(`(
      unaccent(lower(c.nombre))        LIKE unaccent(lower('%' || $${i} || '%')) OR
      unaccent(lower(c.apellido))      LIKE unaccent(lower('%' || $${i} || '%')) OR
      unaccent(lower(c.tipo_cliente))  LIKE unaccent(lower('%' || $${i} || '%')) OR
      unaccent(lower(c.ciudad))        LIKE unaccent(lower('%' || $${i} || '%')) OR
      unaccent(lower(c.email))         LIKE unaccent(lower('%' || $${i} || '%'))
    )`);
    values.push(s);
    i++;
  }

  const whereSQL = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const lim = Number.isFinite(+limite) && +limite > 0 ? +limite : 25;
  const off = Number.isFinite(+offset) && +offset >= 0 ? +offset : 0;

  const sql = `
    WITH filtrados AS (
      SELECT c.id
      FROM clientes c
      ${whereSQL}
      ORDER BY c.id DESC
    ),
    total_rows AS (
      SELECT COUNT(*)::bigint AS total FROM filtrados
    ),
    page AS (
      SELECT id FROM filtrados
      LIMIT $${i++} OFFSET $${i++}
    )
    SELECT
      c.id,
      c.nombre,
      c.apellido,
      c.email,
      c.telefono,
      c.es_vip           AS vip,
      c.activo           AS estado,
      c.tipo_cliente,
      c.fecha_creacion,
      c.fecha_nacimiento,
      c.pais,
      c.notas,
      c.provincia,
      c.codigo_postal,
      c.ciudad,
      c.direccion,
      c.origen,
      COALESCE(COUNT(v.id), 0)                           AS cantidad_compras,
      COALESCE(SUM(v.total)::numeric, 0)                 AS total_gastado,
      MAX(v.fecha)                                       AS fecha_ultima_compra,
      (SELECT total FROM total_rows)                      AS total_rows
    FROM page p
    JOIN clientes c      ON c.id = p.id
    LEFT JOIN ventas  v  ON v.cliente_id = c.id
    GROUP BY c.id
    ORDER BY c.id DESC;
  `;

  values.push(lim, off); 

  const { rows } = await pool.query(sql, values);
  const total = rows[0]?.total_rows ? Number(rows[0].total_rows) : 0;
  return { items: rows, total, limit: lim, offset: off };
};

export const suspenderCuenta = async ({ activo, id }) => {
  const query = `UPDATE clientes SET activo = $1 WHERE id = $2 RETURNING *;`;
  const values = [activo, id];

  const result = await pool.query(query, values);
  return result.rows[0];
};

export const editarClientes = async ({
  id,
  nombre,
  apellido,
  telefono,
  tipo_cliente,
  direccion,
  ciudad,
  pais,
  codigo_postal,
  notas,
  es_vip,
  provincia,
}) => {
  const query = `UPDATE clientes SET
        nombre = $1,
        apellido = $2,
        telefono = $3,
        tipo_cliente = $4,
        direccion = $5,
        ciudad = $6,
        pais = $7,
        codigo_postal = $8,
        notas = $9,
        es_vip = $10,
        provincia = $11
        WHERE id = $12
        RETURNING *; `;

  const values = [
    nombre,
    apellido,
    telefono,
    tipo_cliente,
    direccion,
    ciudad,
    pais,
    codigo_postal,
    notas,
    es_vip,
    provincia,
    id,
  ];
  const result = await pool.query(query, values);

  return result.rows[0];
};

export const obtenerEstadisticasClientes = async ({
  alta = false,
  gestion = false,
}) => {
  if (alta) {
    const sql = `
            SELECT
            COUNT(*) FILTER(WHERE created_at::date = CURRENT_DATE) as nuevos_hoy,
            COUNT(*) FILTER(WHERE created_at::date = CURRENT_DATE AND origen = 'manual') as altas_hoy_manual,
            COUNT(*) FILTER(WHERE created_at::date = CURRENT_DATE AND origen = 'online') as altas_hoy_online,
            COUNT(*) FILTER(WHERE (email IS NULL OR email = '') OR (telefono IS NULL OR telefono = '')) as incompletos
            FROM clientes
            `;

    const {
      rows: [row],
    } = await pool.query(sql);

    const result = {
      nuevos_hoy: Number(row?.nuevos_hoy ?? 0),
      altas_hoy_manual: Number(row?.altas_hoy_manual ?? 0),
      altas_hoy_online: Number(row?.altas_hoy_online ?? 0),
      incompletos: Number(row?.incompletos ?? 0),
    };

    return result;
  }

  if (gestion) {
    const sql = `
            WITH ltv AS (
            SELECT v.cliente_id,
                    SUM(v.total)        AS total_gastado,
                    COUNT(*)            AS compras
            FROM ventas v
            GROUP BY v.cliente_id
            )
            SELECT
            COUNT(*)::bigint                                                      AS total_usuarios,
            COUNT(*) FILTER (WHERE c.origen = 'online')::bigint               AS usuarios_ecommerce,
            COUNT(*) FILTER (WHERE c.origen = 'manual')::bigint                  AS usuarios_manuales,
            COUNT(*) FILTER (WHERE c.activo IS TRUE)::bigint                     AS usuarios_activos,
            COUNT(*) FILTER (WHERE COALESCE(l.total_gastado,0) >= 200000)::bigint AS usuarios_vip,
            COALESCE(SUM(l.total_gastado),0)::numeric(20,2)                      AS total_gastado,
            (COALESCE(SUM(l.total_gastado),0)
                / NULLIF(COUNT(*),0))::numeric(20,2)                              AS promedio_gasto
            FROM clientes c
            LEFT JOIN ltv l ON l.cliente_id = c.id;
            `;

    const {
      rows: [row],
    } = await pool.query(sql);

    const result = {
      total_usuarios: Number(row.total_usuarios),
      usuarios_ecommerce: Number(row.usuarios_ecommerce),
      usuarios_manuales: Number(row.usuarios_manuales),
      usuarios_vip: Number(row.usuarios_vip),
      total_gastado: Number(row.total_gastado),
      promedio_gasto: Number(row.promedio_gasto),
      usuarios_activos: Number(row.usuarios_activos),
    };

    return result;
  }
};
