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

export const getAllProducts = async () => {

    const result = await pool.query(`SELECT * FROM products ORDER BY id asc`);
    return result.rows;
};


export const updateProduct = async (id, {nombre, descripcion, precio, imagen_url, activo, category_id}) => {

    const query = `
    UPDATE products
    SET nombre = $1,
    descripcion = $2,
    precio = $3,
    imagen_url = $4,
    category_id = $5,
    activo = $6
    WHERE id = $7
    RETURNING *;`

    const values = [nombre, descripcion, precio, imagen_url, category_id, activo, id];
   
    const result = await pool.query(query, values);
    return result.rows[0];
 
};


export const deleteProduct = async (id) => {

    const query = `UPDATE products SET activo = false WHERE id = $1 RETURNING *;`;
    const result = await pool.query(query, [id]);
    return result.rows[0];
};