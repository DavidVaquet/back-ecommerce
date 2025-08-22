import pool from "../config/db.js";


export const createUser = async ({nombre, email, password, rol = 'cliente', activo = true}) => {

    const query = `INSERT INTO users (nombre, email, password, rol, activo) 
    VALUES($1, $2, $3, $4, $5) RETURNING *;`;
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

export const editUserInformation = async ({id, direccion, telefono, nombre, apellido}) => {
    const query = `
    UPDATE users
    SET nombre = $1,
    apellido = $2,
    telefono = $3,
    direccion = $4
    WHERE id = $5
    RETURNING id, nombre, apellido, telefono, direccion`;

    const values = [nombre, apellido, telefono, direccion, id];
    const { rows } = await pool.query(query, values);

    return rows[0];
}


export const updatePassword = async ({password, id}) => {

    const query = `
    UPDATE users
    SET password = $1
    WHERE id = $2`;

    const values = [password, id];
    const { rows } = await pool.query(query, values);
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
