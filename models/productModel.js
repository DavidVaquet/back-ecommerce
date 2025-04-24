import pool from '../config/db.js';


export const createProduct = async ({nombre, descripcion, precio, imagen_url, category_id}) => {

    const query = `
    INSERT INTO products (nombre, descripcion, precio, imagen_url, category_id)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *;    `

    const values = [nombre, descripcion, precio, imagen_url, category_id];

    const result = await pool.query(query, values);

    return result.rows[0];
};