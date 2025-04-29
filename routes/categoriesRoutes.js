import express from 'express';
import { getCategories, newCategory, editCategory, categoryState } from '../controllers/CategoriesController.js';

const router = express.Router();


router.get('/getCategories', getCategories);
router.post('/createCategory', newCategory);
router.put('/editCategory/:id', editCategory);
router.patch('/toggleCategoryState/:id', categoryState);


export default router;