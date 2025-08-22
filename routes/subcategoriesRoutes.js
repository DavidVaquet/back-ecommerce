import express from 'express';
import { addSubcategoria, getAllSubcategorias } from '../controllers/SubcategoriesController.js';
import { verifyToken, requireActiveSession, touchSession } from '../middlewares/authMiddlewares.js';

const router = express.Router();

router.post('/newSubcategory', verifyToken, requireActiveSession, touchSession, addSubcategoria);
router.get('/getSubcategories', getAllSubcategorias);

export default router;