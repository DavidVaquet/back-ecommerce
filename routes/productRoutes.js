import express from 'express';
import { activarProducto, addProduct, deleteProduct, editProducts, eliminarProducto, getByBarcode, getProductsCompletos, getStatsProductos, publicarProducto } from '../controllers/ProductController.js';
import { verifyToken, verifyAdmin, touchSession, requireActiveSession } from '../middlewares/authMiddlewares.js';
import { upload } from '../middlewares/multer.js';
import { loadSettings } from '../middlewares/settings.js';
const router = express.Router();

router.post('/newProduct', upload.fields([
    { name: 'image', maxCount: 1},
    { name: 'images', maxCount: 3}
]), verifyToken, loadSettings, requireActiveSession, touchSession, verifyAdmin, addProduct);
router.get('/get-products-barcode/:code', verifyToken, requireActiveSession, touchSession, verifyAdmin, getByBarcode);
router.get('/get-products-completes', verifyToken, getProductsCompletos);
router.get('/get-products-cantidadMinima', verifyToken, getProductsCompletos);
router.get('/get-stats-products', verifyToken, getStatsProductos);
router.put('/editProduct/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, editProducts);
router.put('/publicar-productos', verifyToken, requireActiveSession, touchSession, verifyAdmin, publicarProducto);
router.patch('/deleteProduct/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, deleteProduct);
router.patch('/activarProduct/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, activarProducto);
router.delete('/eliminar-producto/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, eliminarProducto);


export default router;