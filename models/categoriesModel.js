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