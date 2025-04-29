import pool from "../config/db.js";


export const createUser = async (nombre, email, password, rol = 'cliente', activo = true) => {

    const query = `INSERT INTO users (nombre, email, password, rol, activo) VALUES($1, $2, $3, $4, $5) RETURNING *;`;
    const values = [nombre, email, password, rol, activo];

    const result = await pool.query(query, values);
    return result.rows[0];
};


export const findUserByEmail = async (email) => {

    const query = `SELECT * FROM users WHERE email = $1`;
    const values = [email];

    const result = await pool.query(query, values);
    return result.rows[0];
};