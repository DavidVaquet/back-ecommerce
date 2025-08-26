import express from 'express';
import { estadisticasHandler, estadisticasVentasHoy } from '../controllers/Estadisticas.js';
import { verifyToken, requireActiveSession, touchSession } from '../middlewares/authMiddlewares.js';

const router = express.Router();

router.get('/estadisticas-global', verifyToken, estadisticasHandler);
router.get('/estadisticas-ventas-hoy', verifyToken, estadisticasVentasHoy);

export default router;