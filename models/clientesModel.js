import pool from "../config/db.js";

export const altaCliente = async (
    {nombre,
    apellido,
    email,
    telefono,
    fecha_nacimiento,
    tipo_cliente,
    es_vip, direccion,
    ciudad,
    pais,
    codigo_postal,
    notas,
    activo = true }) => {
    
        const query = `INSERT INTO clientes 
        (nombre, apellido, email, telefono, fecha_nacimiento, tipo_cliente, es_vip, direccion, ciudad, pais, codigo_postal, notas, activo) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *;`;
        const values = [nombre, apellido, email, telefono, fecha_nacimiento, tipo_cliente, es_vip, direccion, ciudad, pais, codigo_postal, notas, activo];

        const result = await pool.query(query, values);

        return result.rows[0];
};

export const buscarCliente = async (email) => {
    
    const query = `SELECT * FROM clientes WHERE email = $1;`
    const values = [email];

    const result = await pool.query(query, values);

    return result.rows[0];
}


export const getClientesEstado = async (activo) => {

    let query = `SELECT * FROM CLIENTES`;

    const values = [];
    const conditions = [];
    let i = 1;

    if (activo != undefined && activo != null) {
        conditions.push(`activo = $${i++}`);
        values.push(activo);
    };

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(' AND ')}`
    }
    
    query += ` ORDER BY id DESC`;


    const result = await pool.query(query, values);

    return result.rows;
}


export const obtenerClientesCompras = async () => {

    const query = `SELECT
                    c.id,
                    c.nombre AS nombre,
                    c.apellido AS apellido,
                    c.email AS email,
                    c.telefono AS telefono,
                    c.es_vip AS vip,
                    c.activo AS estado,
                    c.tipo_cliente as tipo_cliente,
                    c.fecha_creacion as fecha_creacion,
                    c.fecha_nacimiento as fecha_nacimiento,
                    c.pais as pais,
                    c.notas,
                    c.provincia,
                    c.codigo_postal,
                    c.ciudad,
                    c.direccion,
                    c.origen as origen,
                    COUNT(v.id) AS cantidad_compras,
                    SUM(v.total::numeric) AS total_gastado,
                    MAX(v.fecha) AS fecha_ultima_compra
                    FROM clientes AS c
                    LEFT JOIN ventas AS v ON c.id = v.cliente_id
                    GROUP BY
                    c.id;`;
    
    const result = await pool.query(query);
    return result.rows;
};

export const suspenderCuenta = async ({activo, id}) => {

    const query = `UPDATE clientes SET activo = $1 WHERE id = $2 RETURNING *;`;
    const values = [activo, id];
    
    const result = await pool.query(query, values);
    return result.rows[0];
}

export const editarClientes = async ({
    id,
    nombre,
    apellido,
    telefono,
    tipo_cliente,
    direccion,
    ciudad,
    pais,
    codigo_postal,
    notas,
    es_vip,
    provincia
    }) => {
        
        const query = `UPDATE clientes SET
        nombre = $1,
        apellido = $2,
        telefono = $3,
        tipo_cliente = $4,
        direccion = $5,
        ciudad = $6,
        pais = $7,
        codigo_postal = $8,
        notas = $9,
        es_vip = $10,
        provincia = $11
        WHERE id = $12
        RETURNING *; `

        const values = [nombre, apellido, telefono, tipo_cliente, direccion, ciudad, pais, codigo_postal, notas, es_vip, provincia, id];
        const result = await pool.query(query, values);
        
        return result.rows[0];
    }