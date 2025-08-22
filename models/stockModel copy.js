import pool from "../config/db.js";


export const getStockProductId = async (client, product_id) => {

    const query = `SELECT cantidad FROM stock WHERE product_id = $1`;
    const values = [product_id];

    const result = await client.query(query, values);
    return result.rows[0];

};


export const addStockProduct = async ({product_id, cantidad, cantidad_minima}) => {

    const result = await pool.query(`SELECT * FROM stock WHERE product_id = $1`, [product_id]);

    if (result.rows.length > 0) {

        const stockActual = result.rows[0].cantidad;
        const nuevaCantidad = stockActual + cantidad;

        const update = await pool.query(`UPDATE stock SET cantidad = $1 WHERE product_id = $2 RETURNING *;`, [nuevaCantidad, product_id])

        return update.rows[0];

    } else {

        const insert = await pool.query(`INSERT INTO stock (product_id, cantidad, cantidad_minima) VALUES ($1, $2, $3) RETURNING *;`, [product_id, cantidad, cantidad_minima])
        return insert.rows[0];
    }
};


export const reduceStockProduct = async ({client, product_id, cantidad}) => {
    const result = await client.query(`SELECT cantidad FROM stock WHERE product_id = $1`, [product_id]);

    if (result.rows.length === 0) {
        throw new Error('No existe stock para este producto');
    };

    if (result.rows[0].cantidad <= 0) {
        throw new Error('No hay unidades disponibles de este producto');
      }

    const stockActual = result.rows[0].cantidad;

    if (stockActual < cantidad) {
        throw new Error('No hay suficiente stock para realizar esta operacion');
    };

    const cantidadNueva = stockActual - cantidad;

    const updateStock = await pool.query('UPDATE stock SET cantidad = $1 WHERE product_id = $2 RETURNING *;', [cantidadNueva, product_id]);
    return updateStock.rows[0]
};