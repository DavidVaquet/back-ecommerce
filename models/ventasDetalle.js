import pool from "../config/db.js";

export const insertarVentaDetalle = async ({client, venta_id, producto}) => {

    const { producto_id, cantidad, precio_unitario, subtotal} = producto;

    const query = `INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5);`;
    const values = [venta_id, producto_id, cantidad, precio_unitario, subtotal];

    const result = await pool.query(query, values);

    return result.rows[0];
};