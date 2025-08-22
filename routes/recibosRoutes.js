import express from 'express';
import { generarReciboVenta, enviarRecibo, descargarRecibo, enviarEmail } from '../controllers/ReciboController.js';
import { verifyToken } from '../middlewares/authMiddlewares.js';

const router = express.Router();

router.post('/generar-recibo', verifyToken, generarReciboVenta);
router.post('/enviar-recibo', verifyToken, enviarRecibo);
router.get('/descargar-recibo/:nombreArchivo', verifyToken, descargarRecibo);
router.post('/enviar-email', verifyToken, enviarEmail);

export default router;