import pool from "../config/db.js";

export const crearVenta = async ({client, canal, medio_pago, total, cliente_id, usuarioId, descuento, subtotal, impuestos, currency, descuento_porcentaje, impuestos_porcentaje}) => {

    const query = `INSERT INTO ventas (canal, medio_pago, total, cliente_id, usuario_id, descuento, subtotal, impuestos, currency, descuento_porcentaje, impuestos_porcentaje) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *;`
    const values = [canal, medio_pago, total, cliente_id, usuarioId, descuento, subtotal, impuestos, currency, descuento_porcentaje, impuestos_porcentaje];

    const result = await client.query(query, values);
    const ventaId = result.rows[0].id;

    const fecha = result.rows[0].fecha || new Date();
    const año = fecha.getFullYear();
    const canalLower = canal.toLowerCase();
    const prefijo = canalLower === "local" ? 'VTA' : "ECM";
    const codigo = `${prefijo}-${año}-${String(ventaId).padStart(3, '0')}`;
    const document = `${prefijo}-${ventaId}`;
    const orden = `ORD-${año}-${String(ventaId).padStart(3, '0')}`;

    await client.query(`UPDATE ventas SET codigo = $1, orden = $2 WHERE id = $3`, [codigo, orden, ventaId]);
    return { ventaId, document };
};

export const getVentasConDetalles = async () => {

    const query = `
    SELECT 
    v.*,
    c.nombre AS cliente_nombre,
    c.apellido AS cliente_apellido,
    c.email AS cliente_email,
    c.telefono AS cliente_telefono,
    u.nombre AS usuario_nombre,
    vt.producto_id AS vt_producto_id,
    vt.cantidad AS vt_cantidad,
    vt.precio_unitario AS vt_precio_unitario,
    vt.subtotal AS vt_subtotal,
    p.nombre AS producto_nombre,
    p.imagen_url AS producto_imagen
    FROM ventas AS v
    JOIN clientes AS c ON v.cliente_id = c.id
    JOIN users as u ON v.usuario_id = u.id
    JOIN ventas_detalle AS vt ON vt.venta_id = v.id
    JOIN products AS p ON vt.producto_id = p.id 
    ORDER BY v.id DESC;
    `;

    const result = await pool.query(query);
    const filas = result.rows;

    const ventasMap = new Map();

    for (const fila of filas) {
        const ventaId = fila.id;

        if(!ventasMap.has(ventaId)){
            ventasMap.set(ventaId, {
                id: fila.id,
                codigo: fila.codigo,
                total: Number(fila.total),
                fecha: fila.fecha,
                canal: fila.canal,
                medio_pago: fila.medio_pago,
                descuento: Number(fila.descuento),
                impuestos: Number(fila.impuestos),
                subtotal: Number(fila.subtotal),
                orden: fila.orden,

                cliente: {
                    nombre: fila.cliente_nombre,
                    apellido: fila.cliente_apellido,
                    email: fila.cliente_email,
                    telefono: fila.cliente_telefono
                },

                usuario: {
                    nombre: fila.usuario_nombre
                },

                productos: []
            })
        }


        ventasMap.get(ventaId).productos.push({
            id: fila.vt_producto_id,
            nombre: fila.producto_nombre,
            precio: Number(fila.vt_precio_unitario),
            cantidad: fila.vt_cantidad,
            imagen: fila.producto_imagen
        })
    }

    return Array.from(ventasMap.values());
}

