import pool from '../config/db.js';


export const newSubcategory = async ({nombre, descripcion, activo = true, categoria_id}) => {

    const query = `INSERT INTO subcategories (nombre, descripcion, activo, categoria_id) VALUES ($1, $2, $3, $4) RETURNING *;`;
    const values = [nombre, descripcion, activo, categoria_id];

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const getAllSubcategories = async () => {
    const result = await pool.query(`SELECT * FROM subcategories WHERE activo = true ORDER BY categoria_id, id ASC;`);
    return result.rows;
};

export const findSubcategoryName = async (nombre) => {

    const query = `SELECT * FROM subcategories WHERE LOWER(nombre) = LOWER($1);`;
    const values = [nombre];

    const result = await pool.query(query, values);
    return result.rows[0];
};   