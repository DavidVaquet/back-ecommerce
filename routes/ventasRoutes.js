import express from 'express';
import { registrarVenta } from '../controllers/VentasController.js';
import { verifyToken } from '../middlewares/authMiddlewares.js';
const router = express.Router();

router.post('/registrar-venta', verifyToken ,registrarVenta);

export default router;