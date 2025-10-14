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


export const updateCategory = async (id, nombre, descripcion) => {

    const query = `UPDATE categories SET nombre = $1, descripcion = $2 WHERE id = $3 RETURNING *;`;
    const values = [nombre, descripcion, id];

    const result = await pool.query(query, values);
    return result.rows[0];
};


export const toggleCategoryState = async (id, activo) => {

    const query = `UPDATE categories SET activo = $1 WHERE id = $2 RETURNING *;`;
    const values = [activo, id];

    const result = await pool.query(query, values);
    return result.rows[0];

};


export const getCategoriasSubcategorias = async ({ limit, offset, search, visible, estado, visibleSub, estadoSub } = {}) => {

    const whereCat = [];
    const whereSubcat = [];
    const params = [];
    let i = 1;

    if (visible != null) {
        whereCat.push(`c.visible = $${i}`);
        params.push(Number(visible));
        i++;
    };

    if (estado != null && String(estado).trim() !== "") {
        whereCat.push(`c.activo = $${i}`);
        params.push(estado);
        i++;
    };

    if (visibleSub != null) {
        whereSubcat.push(`sc.visible = $${i}`);
        params.push(Number(visibleSub));
        i++;
    };

    if (estadoSub != null && String(estadoSub).trim() !== "") {
        whereSubcat.push(`sc.activo = $${i}`);
        params.push(estadoSub);
        i++;
    };

    let searchSql = "";
    if (search != null && search.trim() != '') {

        const likeParam = `%${search.trim()}%`;
        const idxLike = i;
        params.push(likeParam);
        i++

        let idxVisibleSub = null;
        if (visibleSub != null) {
            idxVisibleSub = i;
            params.push(visibleSub);
            i++;
        }

        let idxEstadoSub = null;
        if (estadoSub != null) {
            idxEstadoSub = i;
            params.push(estadoSub);
            i++;
        };

        searchSql = `
            AND (
            unaccent(lower(c.nombre)) LIKE unaccent(lower($${idxLike}))
            OR EXISTS (
             SELECT 1
             FROM subcategories scc
             WHERE scc.categoria_id = c.id
             ${idxVisibleSub ? `AND scc.visible = $${idxVisibleSub}` : ''}
             ${idxEstadoSub ? `AND scc.activo = $${idxEstadoSub}` : ''}
             AND unaccent(lower(scc.nombre)) LIKE unaccent(lower($${idxLike}))
                )
            )
        `;
    };

    const ultimoParametro = params.length;

    const offsetIdx = i++;
    params.push(offset);
    const limitIdx = i++;
    params.push(limit);

    const whereCatSql = whereCat.length ? `WHERE ${whereCat.join(" AND ")} ${searchSql}` : (searchSql ? `WHERE 1=1 ${searchSql}` : "");
    const whereSubcatSql = whereSubcat.length ? `WHERE ${whereSubcat.join(" AND ")}` : "";


    const sql = `
    WITH subcats AS(
        SELECT
         sc.id, sc.nombre, sc.descripcion, sc.activo, sc.categoria_id, sc.fecha_creacion, sc.visible
         FROM subcategories sc
         ${whereSubcatSql}
    ),
    cats AS (
        SELECT
        c.id, c.nombre, c.descripcion, c.activo, c.fecha_creacion, c.visible
        FROM categories c
        ${whereCatSql}
        ORDER BY c.nombre
        OFFSET $${offsetIdx}
        LIMIT $${limitIdx}
    )
        SELECT
        cats.id, cats.nombre, cats.descripcion, cats.activo, cats.visible, to_char(cats.fecha_creacion, 'YYYY-MM-DD') as "fechaCreacion",
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
            )   FILTER (WHERE sc.id IS NOT NULL),
               '[]'::jsonb
        )   AS subcategorias
        FROM cats
        LEFT JOIN subcats sc ON sc.categoria_id = cats.id
        GROUP BY cats.id, cats.nombre, cats.descripcion, cats.activo, cats.visible, cats.fecha_creacion
        ORDER BY cats.nombre;
        `;

        const countSql = `
        SELECT COUNT(*)::int as total
        FROM categories c
        ${whereCatSql}
        `;

        const whereParams = params.slice(0, ultimoParametro);

        const client = await pool.connect();
        try {
            const [data, count] = await Promise.all([
                client.query(sql, params),
                client.query(countSql, whereParams)
            ]);
            return {
                rows: data.rows,
                total: count.rows[0]?.total ?? 0,
                limit,
                offset
            }
        } finally {
            client.release();
        }

}


export const statsCategoriaSubcategorias = async () => {
    const sql = `
    SELECT
    COUNT(c.*) as total_categorias,
    COUNT(*) FILTER(WHERE c.activo IS TRUE) AS categorias_activas,
    COUNT(*) FILTER(WHERE c.activo IS FALSE) AS categorias_inactivas,
    COUNT(sc.*) FILTER(WHERE sc.activo IS TRUE) AS subcategorias_activas,
    COUNT(sc.*) FILTER(WHERE sc.activo IS FALSE) AS subcategorias_inactivas
    FROM categories c
    LEFT JOIN subcategories sc ON sc.categoria_id = c.id
    `;

    const { rows } = await pool.query(sql);
    const r = rows[0] || {};

    return {
        categorias_activas: Number(r?.categorias_activas ?? 0),
        categorias_inactivas: Number(r?.categorias_inactivas ?? 0),
        subcategorias_activas: Number(r?.subcategorias_activas ?? 0),
        subcategorias_inactivas: Number(r?.subcategorias_inactivas ?? 0),
        total_categorias: Number(r?.total_categorias ?? 0)
    }
};

