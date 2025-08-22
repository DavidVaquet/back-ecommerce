import express from 'express';
import { getCategories, newCategory, editCategory, categoryState } from '../controllers/CategoriesController.js';
import { verifyAdmin, verifyRole, verifyToken, requireActiveSession, touchSession } from '../middlewares/authMiddlewares.js';

const router = express.Router();


router.get('/getCategories', getCategories);
router.post('/createCategory', verifyToken, requireActiveSession, touchSession, verifyAdmin, newCategory);
router.put('/editCategory/:id', verifyToken,  requireActiveSession, touchSession, verifyAdmin, editCategory );
router.patch('/toggleCategoryState/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, categoryState);


export default router;