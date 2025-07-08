import pool from "../config/db.js";

export const insertarVentaDetalle = async ({client, venta_id, producto}) => {

    const { producto_id, cantidad, precio: precio_unitario} = producto;
    const subtotal = Number(precio_unitario) * Number(cantidad);

    const query = `INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ($1, $2, $3, $4, $5);`;
    const values = [venta_id, producto_id, cantidad, precio_unitario, subtotal];

    const result = await client.query(query, values);
    return result.rows[0];
};