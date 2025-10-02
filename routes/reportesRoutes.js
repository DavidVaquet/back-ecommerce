import express from 'express';
import { verifyToken } from '../middlewares/authMiddlewares.js';
import { borrarReporte, downloadReport, generateReport, getReports } from '../controllers/ReportsController.js';
import { validarCampos } from '../utils/validaciones.js';
import { query } from 'express-validator';

const router = express.Router();

router.post('/create-report', verifyToken, generateReport);
router.get('/get-reports', verifyToken, [
    query('limite').optional().toInt().isInt({ min: 1}).withMessage('El limite debe ser un número igual o mayor a 1'),
    query('offset').optional().toInt().isInt({ min: 0}).withMessage('El offset debe ser un número igual o mayor a 0'),
    validarCampos
], getReports);
router.get('/download-report/:id', verifyToken,  downloadReport);
router.delete('/delete-report/:id', verifyToken, borrarReporte);

export default router;