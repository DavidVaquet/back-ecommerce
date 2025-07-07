import express from 'express';
import { clientesActivos, crearCliente } from '../controllers/ClientesController.js';
import { verifyToken } from '../middlewares/authMiddlewares.js';

const router = express.Router();

router.post('/alta-cliente', verifyToken, crearCliente);
router.get('/obtener-clientes-activos', verifyToken, clientesActivos);

export default router;