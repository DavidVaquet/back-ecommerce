import express from 'express';
import { addProduct, deleteProduct, editProducts, getProducts } from '../controllers/ProductController.js';
import { verifyToken } from '../middlewares/authMiddlewares.js';
import { upload } from '../middlewares/multer.js';
const router = express.Router();

router.post('/newProduct', upload.fields([
    { name: 'image', maxCount: 1},
    { name: 'images', maxCount: 3}
]), verifyToken, addProduct);
router.get('/getAllProducts', getProducts);
router.put('/editProduct/:id', editProducts);
router.put('/deleteProduct/:id', deleteProduct);


export default router;