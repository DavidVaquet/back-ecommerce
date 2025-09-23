import pool from '../config/db.js';
import cron from 'node-cron';
import { logJob } from '../models/logsModel.js';


cron.schedule('0 23 * * *', async() => {
    const jobname = 'refresh reporting.ventas_diarias';
    try {
        await pool.query('REFRESH MATERIALIZED VIEW CONCURRENTLY reporting.ventas_diarias;');
        await logJob({jobname, success:true, message: 'Refresh completado'});
    } catch (error) {
        console.error(error);
        await logJob({jobname, sucess:false, message: 'Refresh erroneo'});
    }
})