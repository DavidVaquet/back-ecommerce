import express from 'express';
import { addSubcategoria, getAllSubcategorias } from '../controllers/SubcategoriesController.js';

const router = express.Router();

router.post('/newSubcategory', addSubcategoria);
router.get('/getSubcategories', getAllSubcategorias);

export default router;