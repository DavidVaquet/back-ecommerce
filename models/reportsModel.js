import pool from "../config/db.js";
import { promises as fsp } from "node:fs";
import { createReadStream } from "node:fs";
import path from "path";
import { pipeline } from "node:stream/promises";
import { DATASETS, REPORT_FORMAT, TYPE_LABELS } from "../constants/reports.js";
import { formatFecha } from "../utils/date.js";
import { exportReport } from "../controllers/ReportsController.js";

// UTILIDADES
function humanFileSize(bytes) {
  if (bytes == null) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb.toFixed(2)} MB`;
}
// ---------------------------------------

export const generator = {
    async processOne(id) {
        const { rows } = await pool.query(`
        UPDATE reports 
        SET status = 'processing',
        started_at = clock_timestamp()
        WHERE id = $1
        AND status = 'pending'::report_status
        RETURNING *
        `, [id]);

        if (!rows.length) return false;

        const r = rows[0];
        if (!DATASETS[r.type]) throw new Error('Tipo de reporte invalido');
        if (!REPORT_FORMAT.has(r.format)) throw new Error('Formato invalido');

        try {
            const filters = r.filters || {};
            const model = await DATASETS[r.type]({ fromUtc: r.date_from, toUtc: r.date_to, filters });

            const ts = new Date().toISOString().replace(/[:.]/g,'-');
            const base = `${model.title || r.type}_${ts}.${r.format}`;
            const outDir = path.join(process.cwd(), process.env.REPORTDIR, base);
            await fsp.mkdir(path.dirname(outDir), { recursive: true });
            
            // const html = r.format === 'pdf' ? renderGenericHTML(model) : null;
            const result = await exportReport({ format: r.format, outPath: outDir, model });

            const stat = await fsp.stat(result.path);
            console.log(stat);
            await pool.query(`
                UPDATE reports
                SET status = 'ready',
                finished_at = clock_timestamp(),
                file_path = $1,
                file_size_bytes = $2
                WHERE id = $3`, [result.path, stat.size, id]);
            
            return true;

        } catch (error) {
            await pool.query(`
                UPDATE reports
                SET status = 'failed',
                error_message = $1,
                finished_at = clock_timestamp()
                WHERE id = $2`, [error.message, id]);
            throw error;
        }
    } 
}

export const enqueueReport = async (reportId) => {

    setImmediate(async () => {

        try {
            await generator.processOne(reportId);
        } catch (error) {
            console.error(error);
            await pool.query('UPDATE reports SET status = $1, error_message = $2 WHERE id = $3', 
                ['failed', error.message, reportId]);
        }

    })
}

export const createReport = async ({date_to, date_from, type, format, email_to, user_id, filters}) => {
    const client = await pool.connect();
    try {
        const insert = `INSERT INTO reports (user_id, type, format, date_from, date_to, email_to, filters, status)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
                        RETURNING id, status`;

        const values = [user_id, type, format, date_from, date_to, email_to, JSON.stringify(filters || {})];
        const { rows } = await client.query(insert, values);
        const report = rows[0];
        
        await enqueueReport(report.id);
        return report;

    } finally {
        client.release();
    }
}

export const getReportById = async (id) => {
    const { rows } =  await pool.query(`SELECT * FROM reports WHERE id = $1`, [id]);
    return rows[0];
}

export const listForUser = async ({ user_id, page, pageSize, type, status }) => {
    const params = [user_id];
    const where = [`user_id = $${params.length}`];
    

    if (status) { 
        params.push(status);                
        where.push(`status = $${params.length}`);
    };
    if (type) { 
        params.push(type); 
        where.push(`type = $${params.length}`);
        };

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const countSql = `SELECT COUNT(*)::int AS total from reports`;

    const { rows: countRows } = await pool.query(countSql, params);
    const total = countRows[0]?.total || 0;

    const offset = (page - 1) * pageSize;

    const listSql = `
    SELECT id, type, format, status, date_to, date_from, finished_at, created_at, file_size_bytes
    FROM reports
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT $${p++} OFFSET $${p++}
    `;

    const { rows: items } = await pool.query(listSql, params);
    return { items, total, page, pageSize, hasNext: offset + items.length < total };
}

export const historialReportes = async () => {

    const sql = `
    SELECT
    r.id,
    r.user_id,
    r.type,
    r.status,
    r.format,
    r.file_size_bytes,
    r.created_at,
    u.nombre as user_nombre
    FROM reports r
    JOIN users u ON u.id = r.user_id
    ORDER BY r.created_at DESC, r.id DESC`;

    const { rows } = await pool.query(sql);

    const data = rows.map((r) => ({
        id: r.id,
        nombre: TYPE_LABELS[r.type],
        tipo: r.type,
        fecha_generacion: formatFecha(r.created_at),
        formato: r.format,
        estado: r.status,
        tamaño: humanFileSize(r.file_size_bytes),
        generado_por: r.user_nombre || 'Sistema'
    }))

    return data;
}

export const fileStreamRes = async (res, report) => {

    console.log(report);
    const absPath = path.resolve(report.file_path);
    const stat = await fsp.stat(absPath).catch(() => null);

    if (!stat || !stat.isFile()) {
        return res.status(410).json({ msg: 'No se encontró un reporte.'});
    };

    const typeArchivo = report.format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const fileName = `reporte-${report.type}.${report.format}`;

    res.setHeader('Content-Type', typeArchivo);
    res.setHeader('Content-Length', stat.size);
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    const readStream = createReadStream(absPath);
    await pipeline(readStream, res);
}