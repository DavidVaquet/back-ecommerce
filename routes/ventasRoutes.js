import express from 'express';
import { obtenerTotalesVentas, obtenerVentasConDetallesCompletos, registrarVenta } from '../controllers/VentasController.js';
import { verifyToken } from '../middlewares/authMiddlewares.js';
import { loadSettings } from '../middlewares/settings.js';
const router = express.Router();

router.post('/registrar-venta', verifyToken, loadSettings, registrarVenta);
router.get('/obtener-ventas-completo', verifyToken, obtenerVentasConDetallesCompletos);
router.get('/obtener-totales-ventas', verifyToken, obtenerTotalesVentas);

export default router;