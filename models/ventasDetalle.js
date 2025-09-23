import pool from "../config/db.js";

export const insertarVentaDetalle = async ({client, venta_id, producto}) => {

    const { product_id, cantidad, precio: precio_unitario, precio_costo: costo_unitario_en_venta } = producto;
    const subtotal = Number(precio_unitario) * Number(cantidad);

    const query = `INSERT INTO ventas_detalle (venta_id, producto_id, cantidad, precio_unitario, subtotal, costo_unitario_en_venta) 
    VALUES ($1, $2, $3, $4, $5, $6);`;
    const values = [venta_id, product_id, cantidad, precio_unitario, subtotal, costo_unitario_en_venta];

    const result = await client.query(query, values);
    return result.rows[0];
};