import pool from "../config/db.js";

export const logJob = async({jobname, success, message}) => {
    const query = `INSERT INTO cron_log (jobname, success, message) VALUES ($1, $2, $3)`;
    const values = [jobname, success, message];

    const { rows } = await pool.query(query, values);
}