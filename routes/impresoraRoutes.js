import express from 'express';
import { verifyToken } from '../middlewares/authMiddlewares.js';
import { tsplController } from '../controllers/ImpresoraController.js';

const router = express.Router();
router.post('/imprimir-etiqueta/:id', verifyToken, tsplController);
export default router;