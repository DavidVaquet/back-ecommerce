import pool from "../config/db.js";


export const createUser = async ({nombre, email, password, rol = 'cliente', activo = true, passwordNoHash, telefono, apellido, direccion, org_id}) => {

    const query = `INSERT INTO users (nombre, email, password, rol, activo, password_no_hash, telefono, apellido, direccion, org_id) 
    VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *;`;
    const values = [nombre, email, password, rol, activo, passwordNoHash, telefono, apellido, direccion, org_id];

    const result = await pool.query(query, values);
    return result.rows[0];
};


export const findUserByEmailID = async ({email, id}) => {

    const where = [];
    const params = [];

    if (email != null) {
        params.push(email);
        where.push(`email = $${params.length}`);
    }

    if (id != null) {
        params.push(id);
        where.push(`id = $${params.length}`);
    }

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    const query = `SELECT 
    email, id, rol, nombre, password, org_id
    FROM users 
    ${whereSql}`;

    const result = await pool.query(query, params);
    return result.rows[0];
};

export const actualizarUltimoIngreso = async (userId) => {

    const query = `UPDATE users
    SET ultimo_ingreso = NOW() WHERE id = $1`;

    const values = [userId];

    const { rows } = await pool.query(query, values);
}

export const userInformation = async (id) => {

    const query = `SELECT * FROM users WHERE id = $1`;
    const values = [id];

    const result = await pool.query(query, values);
    return result.rows[0];
};

export const editUserInformation = async ({id, direccion, telefono, nombre, apellido, rol, activo}) => {
    const query = `
    UPDATE users
    SET nombre = $1,
    apellido = $2,
    telefono = $3,
    direccion = $4,
    rol = $5,
    activo = $6
    WHERE id = $7
    RETURNING id, nombre, apellido, telefono, direccion, rol, activo`;

    const values = [nombre, apellido, telefono, direccion, rol, activo, id];
    const { rows } = await pool.query(query, values);

    return rows[0];
}

export const deleteUser = async (id) => {

    const sql = `DELETE FROM users WHERE id = $1`;
    const values = [id];
    const { rowCount } = await pool.query(sql, values);
}


export const updatePassword = async ({password, id}) => {

    const query = `
    UPDATE users
    SET password = $1
    WHERE id = $2`;

    const values = [password, id];
    const { rows } = await pool.query(query, values);
}

export const getUsers = async({ filters = {}}) => {
    const where = [];
    const params = [];

    if (filters.excludeRole) {
        params.push(filters.excludeRole.toLowerCase());
        where.push(`LOWER(rol) IS DISTINCT FROM $${params.length}`);
    };

    if (filters.activo) {
        params.push(filters.activo);
        where.push(`activo = $${params.length}`);
    };

    const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}`: '';

    const sql = `
    SELECT 
    id, 
    nombre, 
    email, 
    rol, 
    activo, 
    cliente_id
    FROM users
    ${whereSql}
    ORDER BY id DESC`;

    const { rows } = await pool.query(sql, params);
    return rows;
}


export const createSession = async ({userId, userAgent, ip}) => {

    const query = `
    INSERT INTO user_sessions (user_id, user_agent, ip_created, ip_last) 
    VALUES ($1, $2, $3, $3)
    RETURNING id::text AS session_id`;

    const values = [userId, userAgent, ip];

    const { rows } = await pool.query(query, values);

    return rows[0]?.session_id;
}

export const getSessions = async (userId) => {

    const query = `
    SELECT * FROM user_sessions
    WHERE user_id = $1
    ORDER BY user_id DESC`;

    const values = [userId];

    const { rows } = await pool.query(query, values);

    return rows;
}

export const closeOneSession = async (id, userId) => {

    const query = `UPDATE user_sessions
    SET revoked_at = NOW()
    WHERE id = $1 AND user_id = $2`;

    const values = [id, userId];

    const { rowCount } = await pool.query(query, values);

    return rowCount;
}

export const closeAllSesions = async (id, userId) => {

    const query = `
    UPDATE user_sessions
    SET revoked_at = NOW()
    WHERE id = $1 AND user_id <> $2`;

    const values = [id, userId];

    const { rows } = await pool.query(query, values);
}

export const recentActivity = async ({usuarioId, dispositivo, accion, estado}) => {

    const query = `
    INSERT INTO actividad_reciente (usuario_id, dispositivo, accion, estado)
    VALUES ($1, $2, $3, $4)`;

    const values = [usuarioId, dispositivo, accion, estado];

    const { rows } = await pool.query(query, values);
};

export const getActivityRecent = async ({limite, usuarioId}) => {

    let query = `
    SELECT * FROM actividad_reciente
    WHERE 1=1`;

    let i = 1;
    const values = [];

    if (usuarioId !== undefined && usuarioId !== null) {
        const id = Number(usuarioId);
        query += ` AND usuario_id = $${i++}`;
        values.push(id);
    }

    query += ` ORDER BY id DESC`;

    if (limite !== undefined && limite !== null) {
        const lim = Number(limite);
        query += ` LIMIT $${i++}`;
        values.push(lim);
    }


    const { rows } = await pool.query(query, values);
    return rows;
}
