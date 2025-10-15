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

    const query = `SELECT nombre, id FROM subcategories WHERE LOWER(nombre) = LOWER($1);`;
    const values = [nombre];

    const result = await pool.query(query, values);
    return result.rows[0];
};


export const updateSubcategory = async ({id, nombre, descripcion, visible, activo}) => {

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
    subcategories 
    SET ${sets.join(', ')}
    WHERE id = $${i} 
    RETURNING *;`;

    const result = await pool.query(query, params);
    return result.rows[0];
    
};



export const deleteSubcategory = async(id) => {

    const query = `DELETE FROM subcategories WHERE id = $1`;
    const values = [id];

    const { rowCount } = await pool.query(query, values);
    return rowCount;
}
