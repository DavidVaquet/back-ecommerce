import pool from "../config/db.js";


export const getStockProductId = async (product_id) => {

    const query = `SELECT * FROM stock WHERE product_id = $1`;
    const values = [product_id];

    const result = await pool.query(query, values);
    return result.rows[0];

};


export const addStockProduct = async (product_id, cantidad) => {

    const result = await pool.query(`SELECT * FROM stock WHERE product_id = $1`, [product_id]);

    if (result.rows.length > 0) {

        const stockActual = result.rows[0].cantidad;
        const nuevaCantidad = stockActual + cantidad;

        const update = await pool.query(`UPDATE stock SET cantidad = $1 WHERE product_id = $2 RETURNING *;`, [nuevaCantidad, product_id])

        return update.rows[0];

    } else {

        const insert = await pool.query(`INSERT INTO stock (product_id, cantidad) VALUES ($1, $2) RETURNING *;`, [product_id, cantidad])
        return insert.rows[0];
    }
};