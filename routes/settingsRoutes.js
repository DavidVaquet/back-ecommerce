import express from 'express';
import { requireActiveSession, touchSession, verifyAdmin, verifyToken } from '../middlewares/authMiddlewares.js';
import { gtCompanySettings, patchSettingsCompany, patchSettingsInventory, patchSettingsSales } from '../controllers/SettingsController.js';
import { uploadCompanySettings } from '../middlewares/multer.js';

const router = express.Router();

router.get('/company-settings', verifyToken, gtCompanySettings);
router.patch('/edit-company-settings/:orgId', verifyToken, requireActiveSession, touchSession, verifyAdmin, uploadCompanySettings, patchSettingsCompany);
router.patch('/edit-inventory-settings/:orgId', verifyToken, requireActiveSession, touchSession, verifyAdmin, patchSettingsInventory);
router.patch('/edit-sales-settings/:orgId', verifyToken, requireActiveSession, touchSession, verifyAdmin, patchSettingsSales);
export default router;