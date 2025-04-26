import express from 'express';
import { addProduct, deleteProduct, editProducts, getProducts } from '../controllers/ProductController.js';

const router = express.Router();

router.post('/newProduct', addProduct);
router.get('/getAllProducts', getProducts);
router.put('/editProduct/:id', editProducts);
router.put('/deleteProduct/:id', deleteProduct);


export default router;