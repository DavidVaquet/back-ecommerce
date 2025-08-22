import express from 'express';
import { getMovementStock, getMovementTypes, getTodayStockMovementEstadistics, registrarMovimientoStock } from '../controllers/StockController.js';
import { verifyToken, requireActiveSession, touchSession, verifyAdmin } from '../middlewares/authMiddlewares.js';


const router = express.Router();

router.post('/registrar-movimiento-stock', verifyToken, requireActiveSession, touchSession, verifyAdmin, registrarMovimientoStock);
router.get('/tipos-de-movimiento', verifyToken, requireActiveSession, touchSession, verifyAdmin, getMovementTypes);
router.get('/todos-movimientos', verifyToken, requireActiveSession, touchSession, verifyAdmin, getMovementStock);
router.get('/estadisticas-movimientos-hoy', verifyToken, requireActiveSession, touchSession, verifyAdmin, getTodayStockMovementEstadistics);


export default router;