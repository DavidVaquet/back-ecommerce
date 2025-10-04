import pool from "../config/db.js";

export const agentClaimJobs = async (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.body.limit ?? 1), 20));
  const agentName = String(req.body.agent_name);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const claimSQL = `
      WITH to_claim AS (
        SELECT id
        FROM print_jobs
        WHERE status = 'cola'
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED
        LIMIT $1
      )
      UPDATE print_jobs pj
      SET status='reclamado',
          claimed_by=$2,
          claimed_at=now(),
          updated_at=now()
      FROM to_claim
      WHERE pj.id = to_claim.id
      RETURNING pj.*;
    `;
    const { rows } = await client.query(claimSQL, [limit, agentName]);
    await client.query('COMMIT');
    return res.json({ items: rows });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('agentClaimJobs error:', err);
    return res.status(500).json({ msg: 'Error al reclamar trabajos' });
  } finally {
    client.release();
  }
};

export const agentCompleteJob = async (req, res) => {
  const { id } = req.params;
  const { rowCount } = await pool.query(
    `UPDATE print_jobs
     SET status='completado', completed_at=now(), updated_at=now()
     WHERE id=$1 AND status='reclamado'`,
    [id]
  );
  if (!rowCount) return res.status(400).json({ msg: 'No se puede completar (no está en reclamado o no existe)' });
  return res.json({ msg: 'OK' });
};


export const agentFailJob = async (req, res) => {
  const { id } = req.params;
  const errorMsg = (req.body?.error ?? '').toString().slice(0, 1000);
  const { rowCount } = await pool.query(
    `UPDATE print_jobs
     SET status='fallido', attempts = attempts + 1, last_error=$2, updated_at=now()
     WHERE id=$1 AND status IN ('cola','reclamado')`,
    [id, errorMsg]
  );
  if (!rowCount) return res.status(400).json({ msg: 'No se puede marcar fallido' });
  return res.json({ msg: 'OK' });
};