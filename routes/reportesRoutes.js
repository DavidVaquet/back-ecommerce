import express from 'express';
import { verifyToken } from '../middlewares/authMiddlewares.js';
import { borrarReporte, downloadReport, generateReport, getReports } from '../controllers/ReportsController.js';
import { validarCampos } from '../utils/validaciones.js';
import { query } from 'express-validator';

const router = express.Router();

router.post('/create-report', verifyToken, generateReport);
router.get('/get-reports', verifyToken, getReports);
router.get('/download-report/:id', verifyToken,  downloadReport);
router.delete('/delete-report/:id', verifyToken, borrarReporte);

export default router;