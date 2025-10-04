import pool from '../config/db.js';
import { buildTSPLMinimal } from '../utils/tsplBuild.js';


export const createPrintJobMinimal = async (req, res) => {
  const {
    width_mm,
    height_mm,
    copies = 1,
    producto
  } = req.body;

  
  const { tspl, defaults } = buildTSPLMinimal({
    width_mm,
    height_mm,
    copies,
    producto
  });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const sql = `
      INSERT INTO print_jobs (
        status, width_mm, height_mm, copies, payload, tspl_text
      )
      VALUES ('cola', $1,$2,$3, $4, $5)
      RETURNING id, status, created_at
    `;
    const vals = [
      width_mm, height_mm, copies, JSON.stringify({ producto }), tspl ];

    const { rows } = await client.query(sql, vals);
    await client.query('COMMIT');

    return res.status(201).json({
      id: rows[0].id,
      status: rows[0].status,
      created_at: rows[0].created_at,
      preview_tspl: tspl
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('createPrintJobMinimal error:', err);
    return res.status(500).json({ msg: 'Error al crear el trabajo de impresión' });
  } finally {
    client.release();
  }
};

export const listPrintJobs = async (req, res) => {
  const { status, limit = 20, offset = 0 } = req.query;

  const where = [];
  const vals = [];
  if (status) { vals.push(status); where.push(`status = $${vals.length}`); }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
  vals.push(Number(limit), Number(offset));

  const sql = `
    SELECT id, status, width_mm, height_mm, copies, attempts, last_error, created_at, updated_at
    FROM print_jobs
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT $${vals.length - 1} OFFSET $${vals.length}
  `;

  const { rows } = await pool.query(sql, vals);
  return res.json({ items: rows, limit: Number(limit), offset: Number(offset) });
};

export const getPrintJob = async (req, res) => {
  const { id } = req.params;
  const { rows } = await pool.query(
    `SELECT * FROM print_jobs WHERE id = $1 LIMIT 1`, [id]
  );
  if (!rows.length) return res.status(404).json({ msg: 'No encontrado' });
  return res.json(rows[0]);
};
