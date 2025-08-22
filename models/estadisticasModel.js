import pool from '../config/db.js';

const valorTotalInventario = async () => {

    const query = `
    SELECT SUM(p.precio * s.cantidad) AS valor_total_inventario
    FROM products AS p 
    JOIN stock AS s ON = p.id = s.product_id`;

    const result = await pool.query(query);
    return result.rows[0];
};

const productosBajoStock = async () => {

    const result = await pool.query(`
        SELECT COUNT(*) AS productos_bajo_stock
        FROM products AS p
        JOIN stock AS s ON p.id = s.product_id
        WHERE s.cantidad < s.cantidad_minima
        AND s.cantidad > 0`
    )

    return result.rows[0];
}

const productoSinStock = async () => {

    const result = await pool.query(`
        SELECT COUNT(*) AS productos_sin_stock
        FROM products AS p
        JOIN stock AS s ON p.id = s.product_id
        WHERE s.cantidad = 0`
    );

    return result.rows[0];
}

const totalProductos = async () => {

    const result = await pool.query(`
        SELECT COUNT(*) AS total_productos FROM products`
    );

    return result.rows[0];
}

const ventasMesActual = async () => {

    const result = await pool.query(`
        SELECT SUM(total) AS venta_mes_actual
        FROM ventas
        WHERE fecha >= date_trunc('month', current_date)
        AND fecha < date_trunc('month', current_date) + interval '1 month';
        `
    )

    return result.rows[0];
}

const productosCriticos = async () => {

    const result = await pool.query(`
        SELECT COUNT(*) as productos_criticos
        FROM products AS p
        JOIN stock AS s ON p.id = s.product_id
        WHERE s.cantidad < s.cantidad_minima`
    );

    return result.rows[0];
};


