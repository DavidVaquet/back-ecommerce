import express from 'express';
import { clientesConCompras, crearCliente, suspenderCliente, modificarCliente, clientesEstado } from '../controllers/ClientesController.js';
import { verifyToken, verifyRole, requireActiveSession, touchSession, verifyAdmin } from '../middlewares/authMiddlewares.js';

const router = express.Router();

router.post('/alta-cliente', verifyToken, crearCliente);
router.get('/obtener-clientes', verifyToken, requireActiveSession, touchSession, verifyAdmin, clientesEstado);
router.get('/obtener-clientes-compras', verifyToken, requireActiveSession, touchSession, verifyAdmin, clientesConCompras);
router.patch('/suspender-cliente/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, suspenderCliente);
router.put('/editar-cliente/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, modificarCliente);

export default router;