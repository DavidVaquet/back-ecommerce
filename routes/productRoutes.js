import express from 'express';
import { addProduct } from '../controllers/ProductController.js';

const router = express.Router();

router.post('/newProduct', addProduct);


export default router;