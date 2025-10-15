import pool from "../config/db.js";


export const getAllCategories = async ({ activo }) => {

    const where = [];
    const params = [];
    let i = 1;

    if (activo != null) {
        where.push(`activo = $${i++}`);
        params.push(activo);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const sql = `
        SELECT * FROM categories 
        ${whereSql} 
        ORDER BY id ASC`;

    const { rows } = await pool.query(sql, params);

    return rows;

};

export const createCategory = async ({nombre, descripcion, activo = true}) => {

    const query = `INSERT INTO categories (nombre, descripcion, activo) VALUES ($1, $2, $3) RETURNING *;`;
    const values = [nombre, descripcion, activo];

    const result = await pool.query(query, values);
    return result.rows[0];
};


export const findCategoryByName = async (nombre) => {

    const query = 'SELECT * FROM categories WHERE LOWER(nombre) = LOWER($1)';
    const values = [nombre];

    const result = await pool.query(query, values);
    return result.rows[0];
};


export const updateCategory = async ({id, nombre, descripcion, visible, activo}) => {

    const sets = [];
    const params = [];
    let i = 1;

    if (nombre != null) {
        sets.push(`nombre = $${i++}`);
        params.push(nombre)
    }

    if (descripcion != null) {
        sets.push(`descripcion = $${i++}`);
        params.push(descripcion);
    }

    if (visible != null) {
        sets.push(`visible = $${i++}`);
        params.push(Number(visible))
    }

    if (activo != null) {
      sets.push(`activo = $${i++}`);
      params.push(activo)
    }

    if (sets.length === 0) {
      return { changed: false };
    }

    params.push(id);

    const query = `UPDATE 
    categories 
    SET ${sets.join(', ')}
    WHERE id = $${i} 
    RETURNING *;`;

    const result = await pool.query(query, params);
    return result.rows[0];
    
};


export const toggleCategoryState = async ({id, activo}) => {

    const query = `UPDATE categories SET activo = $1 WHERE id = $2 RETURNING *;`;
    const values = [activo, id];

    const result = await pool.query(query, values);
    return result.rows[0];

};

export const deleteCategory = async(id) => {

    const query = `DELETE FROM categories WHERE id = $1`;
    const values = [id];

    const { rowCount } = await pool.query(query, values);
    return rowCount;
}


export const getCategoriasSubcategorias = async ({
  limit,
  offset,
  search,
  visible,
  estado,
  visibleSub,
  estadoSub,
} = {}) => {
  const toBool = (v) =>
    typeof v === "boolean" ? v : String(v).trim().toLowerCase() === "true";
  const isSet = (v) => v !== null && v !== undefined && String(v).trim() !== "";


  const whereSub = [];
  const paramsSub = [];

  if (visibleSub != null) {
    paramsSub.push(Number(visibleSub));
    whereSub.push(`sc.visible = $${paramsSub.length}`);
  }
  if (isSet(estadoSub)) {
    paramsSub.push(toBool(estadoSub));
    whereSub.push(`sc.activo = $${paramsSub.length}`);
  }

  const whereSubSql = whereSub.length ? `WHERE ${whereSub.join(" AND ")}` : "";

 
  const whereCatMain = [];
  const paramsCatMain = [];
  const offsetIndexMain = paramsSub.length; 

  const addCatMain = (val) => {
    paramsCatMain.push(val);
    return `$${offsetIndexMain + paramsCatMain.length}`;
  };

  if (visible != null) {
    whereCatMain.push(`c.visible = ${addCatMain(Number(visible))}`);
  }
  if (isSet(estado)) {
    whereCatMain.push(`c.activo = ${addCatMain(toBool(estado))}`);
  }

  let searchSqlMain = "";
  if (isSet(search)) {
    const likeIdx = addCatMain(`%${String(search).trim()}%`);
    const extraSub = [];
    if (visibleSub != null) extraSub.push(`scc.visible = ${addCatMain(Number(visibleSub))}`);
    if (isSet(estadoSub))  extraSub.push(`scc.activo = ${addCatMain(toBool(estadoSub))}`);
    const extraSubSql = extraSub.length ? `AND ${extraSub.join(" AND ")}` : "";

    searchSqlMain = `
      AND (
        unaccent(lower(c.nombre)) LIKE unaccent(lower(${likeIdx}))
        OR EXISTS (
          SELECT 1
          FROM subcategories scc
          WHERE scc.categoria_id = c.id
          ${extraSubSql}
          AND unaccent(lower(scc.nombre)) LIKE unaccent(lower(${likeIdx}))
        )
      )
    `;
  }

  const whereCatSqlMain =
    whereCatMain.length || searchSqlMain.trim()
      ? `WHERE ${whereCatMain.length ? whereCatMain.join(" AND ") : "1=1"} ${searchSqlMain}`
      : "";


  const whereCatCount = [];
  const paramsCatCount = [];

  const addCatCount = (val) => {
    paramsCatCount.push(val);
    return `$${paramsCatCount.length}`;
  };

  if (visible != null) {
    whereCatCount.push(`c.visible = ${addCatCount(Number(visible))}`);
  }
  if (isSet(estado)) {
    whereCatCount.push(`c.activo = ${addCatCount(toBool(estado))}`);
  }

  let searchSqlCount = "";
  if (isSet(search)) {
    const likeIdx = addCatCount(`%${String(search).trim()}%`);

    const extraSub = [];
    if (visibleSub != null) extraSub.push(`scc.visible = ${addCatCount(Number(visibleSub))}`);
    if (isSet(estadoSub))  extraSub.push(`scc.activo = ${addCatCount(toBool(estadoSub))}`);
    const extraSubSql = extraSub.length ? `AND ${extraSub.join(" AND ")}` : "";

    searchSqlCount = `
      AND (
        unaccent(lower(c.nombre)) LIKE unaccent(lower(${likeIdx}))
        OR EXISTS (
          SELECT 1
          FROM subcategories scc
          WHERE scc.categoria_id = c.id
          ${extraSubSql}
          AND unaccent(lower(scc.nombre)) LIKE unaccent(lower(${likeIdx}))
        )
      )
    `;
  }

  const whereCatSqlCount =
    whereCatCount.length || searchSqlCount.trim()
      ? `WHERE ${whereCatCount.length ? whereCatCount.join(" AND ") : "1=1"} ${searchSqlCount}`
      : "";

  const offsetIdx = paramsSub.length + paramsCatMain.length + 1;
  const limitIdx  = offsetIdx + 1;

  const sql = `
    WITH subcats AS (
      SELECT
        sc.id, sc.nombre, sc.descripcion, sc.activo,
        sc.categoria_id, sc.fecha_creacion, sc.visible
      FROM subcategories sc
      ${whereSubSql}
    ),
    cats AS (
      SELECT
        c.id, c.nombre, c.descripcion, c.activo, c.fecha_creacion, c.visible
      FROM categories c
      ${whereCatSqlMain}
      ORDER BY c.nombre
      OFFSET $${offsetIdx}
      LIMIT $${limitIdx}
    )
    SELECT
      cats.id, cats.nombre, cats.descripcion, cats.activo, cats.visible,
      to_char(cats.fecha_creacion, 'YYYY-MM-DD') AS "fechaCreacion",
      COALESCE(
        JSONB_AGG(
          JSONB_BUILD_OBJECT(
            'id', sc.id,
            'nombre', sc.nombre,
            'estado', sc.activo,
            'visible', sc.visible,
            'fecha_creacion', to_char(sc.fecha_creacion, 'YYYY-MM-DD'),
            'descripcion', sc.descripcion
          )
          ORDER BY sc.nombre
        ) FILTER (WHERE sc.id IS NOT NULL),
        '[]'::jsonb
      ) AS subcategorias
    FROM cats
    LEFT JOIN subcats sc ON sc.categoria_id = cats.id
    GROUP BY cats.id, cats.nombre, cats.descripcion, cats.activo, cats.visible, cats.fecha_creacion
    ORDER BY cats.nombre;
  `;

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM categories c
    ${whereCatSqlCount}
  `;

  const paramsMain  = [...paramsSub, ...paramsCatMain, offset, limit];
  const paramsCount = paramsCatCount;

  const client = await pool.connect();
  try {
    const [data, count] = await Promise.all([
      client.query(sql, paramsMain),
      client.query(countSql, paramsCount),
    ]);

    return {
      rows: data.rows,
      total: count.rows[0]?.total ?? 0,
      limit,
      offset,
    };
  } finally {
    client.release();
  }
};


export const statsCategoriaSubcategorias = async () => {
    const sql = `
    SELECT
    (SELECT COUNT(*) FROM categories)                                           AS total_categorias,
    (SELECT COUNT(*) FROM categories WHERE activo IS TRUE)                      AS categorias_activas,
    (SELECT COUNT(*) FROM categories WHERE activo IS FALSE)                     AS categorias_inactivas,
    (SELECT COUNT(*) FROM subcategories)                                        AS total_subcategorias;
    `;

    const { rows } = await pool.query(sql);
    const r = rows[0] || {};

    return {
        categorias_activas: Number(r?.categorias_activas ?? 0),
        categorias_inactivas: Number(r?.categorias_inactivas ?? 0),
        total_subcategorias: Number(r?.total_subcategorias ?? 0),
        total_categorias: Number(r?.total_categorias ?? 0)
    }
};

