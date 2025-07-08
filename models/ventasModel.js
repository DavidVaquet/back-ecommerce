import pool from "../config/db.js";

export const crearVenta = async ({client, canal, medio_pago, total, cliente_id}) => {

    const query = `INSERT INTO ventas (canal, medio_pago, total, cliente_id) VALUES ($1, $2, $3, $4) RETURNING *;`
    const values = [canal, medio_pago, total, cliente_id];

    const result = await client.query(query, values);
    return result.rows[0].id;
};

