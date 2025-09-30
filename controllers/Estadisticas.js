import { getEstadisticasGlobales } from "../models/estadisticasModel.js";
import pool from '../config/db.js'

export async function estadisticasHandler(req, res) {
  try {
    const periodo = req.query.periodo || "30d";
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : null;

    const topLimit       = req.query.topLimit       ? Number(req.query.topLimit)       : 10;
    const topOffset      = req.query.topOffset      ? Number(req.query.topOffset)      : 0;
    const criticosLimit  = req.query.criticosLimit  ? Number(req.query.criticosLimit)  : 20;
    const criticosOffset = req.query.criticosOffset ? Number(req.query.criticosOffset) : 0;

    const data = await getEstadisticasGlobales({
      periodo,
      categoryId,
      topLimit,
      topOffset,
      criticosLimit,
      criticosOffset,
    });

    res.json(data);
  } catch (err) {
    console.error("Error en /api/estadisticas:", err);
    res.status(500).json({ error: "Error al calcular estadísticas" });
  }
}


export const estadisticasVentasHoy = async (req, res) => {
  try {
    const { canal } = req.query; 

    const canalWhere = canal ? `AND v.canal = $1` : ``;
    const params = [];
    if (canal) params.push(canal);

    const sql = `
      WITH bounds AS (
        SELECT
          date_trunc('day', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')) AS start_local,
          date_trunc('day', (now() AT TIME ZONE 'America/Argentina/Buenos_Aires')) + interval '1 day' AS end_local
      ),
      ventas_filtradas AS (
        SELECT v.id, v.total
        FROM ventas v
        CROSS JOIN bounds b
        WHERE
          (v.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires') >= b.start_local
          AND (v.fecha AT TIME ZONE 'America/Argentina/Buenos_Aires') <  b.end_local
          ${canalWhere}
      ),
      items_hoy AS (
        SELECT COALESCE(SUM(vi.cantidad), 0)::int AS productos_vendidos
        FROM ventas_filtradas vf
        LEFT JOIN ventas_detalle vi ON vi.venta_id = vf.id
      )
      SELECT
        (SELECT COUNT(*)::int FROM ventas_filtradas) AS ventas_hoy,
        (SELECT COALESCE(SUM(total), 0)::numeric FROM ventas_filtradas) AS total_ventas_hoy,
        (SELECT productos_vendidos FROM items_hoy) AS productos_vendidos;
    `;

    const { rows } = await pool.query(sql, params);
    const r = rows[0] || { ventas_hoy: 0, total_ventas_hoy: 0, productos_vendidos: 0 };
    
    const metaVentas = 1000000;
    const progresoMeta = metaVentas > 0 ? (Number(r.total_ventas_hoy) / metaVentas) * 100 : 0;

    return res.json({
      ventasHoy: r.ventas_hoy,
      totalVentasHoy: Number(r.total_ventas_hoy),
      productosVendidos: r.productos_vendidos,
      metaVentas,
      progresoMeta: Number(progresoMeta.toFixed(2)),
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ msg: 'Error obteniendo estadísticas de ventas de hoy' });
  }
};