import express from 'express';
import { verifyToken } from '../middlewares/authMiddlewares.js';
import { downloadReport, generateReport, getReports } from '../controllers/ReportsController.js';

const router = express.Router();

router.post('/create-report', verifyToken, generateReport);
router.get('/get-reports', verifyToken, getReports);
router.get('/download-report/:id', verifyToken, downloadReport);

export default router;