import express from 'express';
import { obtenerVentasConDetallesCompletos, registrarVenta } from '../controllers/VentasController.js';
import { verifyToken } from '../middlewares/authMiddlewares.js';
const router = express.Router();

router.post('/registrar-venta', verifyToken, registrarVenta);
router.get('/obtener-ventas-completo', verifyToken, obtenerVentasConDetallesCompletos);

export default router;