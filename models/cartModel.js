import pool from "../config/db.js";


export const addCart = async (user_id, product_id, cantidad) => {

    const existe = await pool.query(`SELECT * FROM carrito WHERE user_id = $1 AND product_id = $2`,
        [user_id, product_id]
    );

    if (existe.rows.length > 0) {
        const cantidadTotal = existe.rows[0].cantidad + cantidad;

        const actualizarCarrito = await pool.query(`UPDATE carrito SET cantidad = $1 WHERE user_id = $2 AND product_id = $3 RETURNING *;`,
            [cantidadTotal, user_id, product_id]
        );

        return actualizarCarrito.rows[0];
    } else {
        const insertar = await pool.query(`INSERT INTO carrito (user_id, product_id, cantidad) VALUES ($1,$2,$3)`,
            [user_id, product_id, cantidad]
        );
        return insertar.rows[0];
    };
};