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
    activo }) => {
    
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


export const obtenerClienteActivo = async () => {

    const query = `SELECT * FROM CLIENTES WHERE activo = true ORDER BY id DESC`;
    const result = await pool.query(query);

    return result.rows;
}