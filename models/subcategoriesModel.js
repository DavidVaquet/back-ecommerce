import pool from '../config/db.js';


export const newSubcategory = async ({nombre, descripcion, activo = true, categoria_id}) => {

    const query = `INSERT INTO subcategories (nombre, descripcion, activo, categoria_id) VALUES ($1, $2, $3, $4) RETURNING *;`;
    const values = [nombre, descripcion, activo, categoria_id];

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const getAllSubcategories = async ({ activo }) => {
    
    const where = [];
    const params = [];
    let i = 1;

    if (activo != null) {
        where.push(`activo = $${i++}`);
        params.push(activo);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';


    const sql = `
         SELECT * FROM subcategories
         ${whereSql}  
         ORDER BY categoria_id, id ASC`;
         
    const { rows } = await pool.query(sql, params);
    return rows;
};

export const findSubcategoryName = async (nombre) => {

    const query = `SELECT * FROM subcategories WHERE LOWER(nombre) = LOWER($1);`;
    const values = [nombre];

    const result = await pool.query(query, values);
    return result.rows[0];
};
