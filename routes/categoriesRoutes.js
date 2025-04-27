import express from 'express';
import { getCategories, newCategory, editCategory } from '../controllers/CategoriesController.js';

const router = express.Router();


router.get('/getCategories', getCategories);
router.post('/createCategory', newCategory);
router.put('/editCategory/:id', editCategory);


export default router;