import express from 'express';
import { activarProducto, addProduct, deleteProduct, editProducts, eliminarProducto, getByBarcode, getProductId, getProductsCompletos, getStatsProductos, publicarProducto } from '../controllers/ProductController.js';
import { verifyToken, verifyAdmin, touchSession, requireActiveSession } from '../middlewares/authMiddlewares.js';
import { upload } from '../middlewares/multer.js';
import { loadSettings } from '../middlewares/settings.js';
import { body, param, query} from 'express-validator';
import { validarCampos, normalizeMulterBody } from '../utils/validaciones.js';
const router = express.Router();


router.post('/newProduct', upload.fields([
    { name: 'image', maxCount: 1},
    { name: 'images', maxCount: 3}
]), normalizeMulterBody, verifyToken, loadSettings, requireActiveSession, touchSession, verifyAdmin, [
    body('nombre').trim().notEmpty().withMessage('El campo nombre es obligatorio'),
    body('precio').notEmpty().withMessage('El campo precio es obligatoio').bail().isFloat({ min: 0}).withMessage('El precio debe ser mayor o igual a 0').bail(),
    body('subcategoria_id').notEmpty().withMessage('Debes seleccionar una subcategoría').bail().toInt(),
    body('precio_costo').notEmpty().withMessage('El campo costo es obligatorio').bail().isFloat({min: 0}).withMessage('El costo debe ser mayor o igual a 0').toFloat(),
    body('cantidad').optional().isInt({min: 0}).withMessage('La cantidad debe ser mayor o igual a 0').bail().toInt(),
    body('cantidad_minima').optional().isInt({min: 0}).withMessage('La cantidad mínima debe ser mayor o igual a 0').bail().toInt(),
    body('estado').notEmpty().withMessage('El campo estado es obligatorio').bail().toInt(),
    body('marca').trim().notEmpty().withMessage('El campo marca es obligatorio'),
    body('currency').notEmpty().withMessage('Debes seleccionar una moneda').bail().isIn(['ARS','USD']).withMessage('Moneda inválida (ARS o USD)')
], validarCampos, addProduct);

router.get('/get-products-barcode/:code', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    param('code').exists({values: 'null'}).withMessage('Falta el código de barra').bail(),
    validarCampos
], getByBarcode);

router.get('/get-products-completes', verifyToken, [
        query('publicado').optional().isInt({min: 0, max: 1 }).withMessage('Publicado debe ser 0 o 1').toInt().bail(),
        query('estado').optional().isInt({min: 0, max: 1 }).withMessage('El estado debe ser 0 o 1').bail().toInt(),
        query('search').optional().isString().trim(),
        query('limit').optional().isInt({ min: 1}).withMessage('El limite debe ser un número igual o mayor a 1').bail().toInt(),
        query('offset').optional().isInt({ min: 0}).withMessage('El offset debe ser un número igual o mayor a 0').bail().toInt(),
        query('stockBajo').optional().isInt({min: 0}).withMessage('Stock bajo debe ser mayor o igual a 0').bail().toInt(),
        query('categoria_id').optional().isInt({min: 1}).withMessage('Categoria_id debe ser mayor o igual a 1').bail().toInt(),
        query('subcategoria_id').optional().isInt({min: 1}).withMessage('Subcategoria_id debe ser mayor o igual a 1').bail().toInt(),
        validarCampos       
], getProductsCompletos);

router.get('/get-product/:id', verifyToken,[
    param('id').exists({ values: 'null'}).withMessage('Falta el id del producto').bail().toInt(),
    validarCampos
], getProductId);


router.get('/get-products-cantidadMinima', verifyToken, getProductsCompletos);

router.get('/get-stats-products', verifyToken, [
    query('lowStockMin').optional().isInt({ min: 0}).withMessage('La cantidad debe ser mayor o igual a 0').bail().toInt(),
    validarCampos
], getStatsProductos);


router.put('/editProduct/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    param('id').exists({ values: 'null'}).withMessage('Falta el id del producto').bail().toInt(),
    body('nombre').exists({values: 'falsy'}).withMessage('El campo nombre es obligatorio').bail(),
    body('precio').exists({values: ['', null]}).withMessage('El campo precio es obligatorio').bail().isFloat({min: 0}).withMessage('El precio debe ser mayor o igual a 0').toFloat(),
    body('subcategoria_id').exists({ values: ['', null] }).withMessage('Debes seleccionar una subcategoría').bail().toInt(),
    body('precio_costo').exists({values: ['', null]}).withMessage('El campo costo es obligatorio').bail().isFloat({min: 0}).withMessage('El costo debe ser mayor o igual a 0').toFloat(),
    body('marca').exists({ values: 'falsy' }).withMessage('El campo marca es obligatorio').bail(),
    validarCampos
], editProducts);

router.put('/publicar-productos', verifyToken, requireActiveSession, touchSession, verifyAdmin, publicarProducto);


router.patch('/deleteProduct/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    param('id').exists({ values: ['', null]}).withMessage('Falta el id del producto').bail().toInt(),
    validarCampos
], deleteProduct);
router.patch('/activarProduct/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    param('id').exists({ values: ['', null]}).withMessage('Falta el id del producto').bail().toInt(),
    validarCampos
] , activarProducto);

router.delete('/eliminar-producto/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    param('id').exists({ values: ['', null]}).withMessage('Falta el id del producto').bail().toInt(),
    validarCampos
], eliminarProducto);


export default router;