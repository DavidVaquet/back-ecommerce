import express from 'express';
import { activarProducto, addProduct, deleteProduct, editProducts, eliminarProducto, getByBarcode, getProductId, getProductsCompletos, getStatsProductos, publicarProducto } from '../controllers/ProductController.js';
import { verifyToken, verifyAdmin, touchSession, requireActiveSession } from '../middlewares/authMiddlewares.js';
import { upload } from '../middlewares/multer.js';
import { loadSettings } from '../middlewares/settings.js';
import { body, param, query} from 'express-validator';
import { validarCampos, normalizeMulterBody } from '../utils/validaciones.js';
const router = express.Router();


router.post(
  '/newProduct',
  upload.fields([
    { name: 'image',  maxCount: 1 },
    { name: 'images', maxCount: 3 }
  ]),
  normalizeMulterBody,
  verifyToken,
  loadSettings,
  requireActiveSession,
  touchSession,
  verifyAdmin,
  [

    body('nombre')
      .trim().notEmpty().withMessage('El campo nombre es obligatorio'),

    body('marca')
      .trim().notEmpty().withMessage('El campo marca es obligatorio'),

    body('currency')
      .trim().notEmpty().withMessage('Debes seleccionar una moneda')
      .bail()
      .customSanitizer(v => String(v).toUpperCase())
      .isIn(['ARS','USD']).withMessage('Moneda inválida (ARS o USD)'),

    body('precio')
      .trim().notEmpty().withMessage('El campo precio es obligatorio') 
      .bail()
      .customSanitizer(v => {
        let s = String(v).trim().replace(/\./g, '').replace(/,/g, '.');
        if (s.endsWith('.')) s += '0'; 
        return s;
      })
      .isFloat({ min: 0 }).withMessage('El precio debe ser mayor o igual a 0')
      .toFloat(),

    body('precio_costo')
      .trim().notEmpty().withMessage('El campo costo es obligatorio')
      .bail()
      .customSanitizer(v => {
        let s = String(v).trim().replace(/\./g, '').replace(/,/g, '.');
        if (s.endsWith('.')) s += '0';
        return s;
      })
      .isFloat({ min: 0 }).withMessage('El costo debe ser mayor o igual a 0')
      .toFloat(),

    body('subcategoria_id')
      .notEmpty().withMessage('Debes seleccionar una subcategoría')
      .bail()
      .isInt({ min: 1 }).withMessage('Subcategoría inválida')
      .toInt(),

    body('estado')
      .notEmpty().withMessage('El campo estado es obligatorio')
      .bail()
      .isInt({ min: 0, max: 1 }).withMessage('Estado inválido (0 o 1)')
      .toInt(),

    body('destacado')
      .optional({ values: 'null' })
      .customSanitizer(v => (v == null || v === '' ? '0' : String(v)))
      .isInt({ min: 0, max: 1 }).withMessage('Destacado inválido (0 o 1)')
      .toInt(),

    body('cantidad')
      .optional({ values: 'null' })
      .customSanitizer(v => (v === '' ? '0' : v))
      .isInt({ min: 0 }).withMessage('La cantidad debe ser mayor o igual a 0')
      .toInt(),

    body('cantidad_minima')
      .optional({ values: 'null' })
      .customSanitizer(v => (v === '' ? '0' : v))
      .isInt({ min: 0 }).withMessage('La cantidad mínima debe ser mayor o igual a 0')
      .toInt(),
  ],
  validarCampos,
  addProduct
);

router.get('/get-products-barcode/:code', verifyToken, requireActiveSession, touchSession, verifyAdmin, getByBarcode);

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

router.get(
  '/get-product/:id',
  verifyToken,
  [
    param('id')
      .trim()
      .notEmpty().withMessage('Falta el id del producto')
      .bail()
      .isInt({ min: 1 }).withMessage('El id debe ser un entero ≥ 1')
      .toInt(),
  ],
  validarCampos,
  getProductId
);


router.get('/get-products-cantidadMinima', verifyToken, getProductsCompletos);

router.get('/get-stats-products', verifyToken, getStatsProductos);


router.put(
  '/editProduct/:id',
  verifyToken,
  requireActiveSession,
  touchSession,
  verifyAdmin,
  [
    param('id')
      .trim()
      .notEmpty().withMessage('Falta el id del producto')
      .bail()
      .isInt({ min: 1 }).withMessage('El id debe ser un entero ≥ 1')
      .toInt(),

    body('nombre')
      .trim()
      .notEmpty().withMessage('El campo nombre es obligatorio'),

    body('marca')
      .trim()
      .notEmpty().withMessage('El campo marca es obligatorio'),

    body('precio')
      .trim()
      .notEmpty().withMessage('El campo precio es obligatorio')
      .bail()
      .customSanitizer(v => {
        let s = String(v).trim().replace(/\./g, '').replace(/,/g, '.');
        if (s.endsWith('.')) s += '0'; // "1000." -> "1000.0"
        return s;
      })
      .isFloat({ min: 0 }).withMessage('El precio debe ser mayor o igual a 0')
      .toFloat(),

    body('precio_costo')
      .trim()
      .notEmpty().withMessage('El campo costo es obligatorio')
      .bail()
      .customSanitizer(v => {
        let s = String(v).trim().replace(/\./g, '').replace(/,/g, '.');
        if (s.endsWith('.')) s += '0';
        return s;
      })
      .isFloat({ min: 0 }).withMessage('El costo debe ser mayor o igual a 0')
      .toFloat(),

    body('subcategoria_id')
      .notEmpty().withMessage('Debes seleccionar una subcategoría')
      .bail()
      .isInt({ min: 1 }).withMessage('Subcategoría inválida')
      .toInt(),
  ],
  validarCampos,
  editProducts
);

router.put('/publicar-productos', verifyToken, requireActiveSession, touchSession, verifyAdmin, publicarProducto);


router.patch('/deleteProduct/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    param('id')
      .trim()
      .notEmpty().withMessage('Falta el id del producto')
      .bail()
      .isInt({ min: 1 }).withMessage('El id debe ser un entero ≥ 1')
      .toInt(),
  ], validarCampos, deleteProduct);
router.patch('/activarProduct/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    param('id')
      .trim()
      .notEmpty().withMessage('Falta el id del producto')
      .bail()
      .isInt({ min: 1 }).withMessage('El id debe ser un entero ≥ 1')
      .toInt(),
  ], validarCampos, activarProducto);

router.delete('/eliminar-producto/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    param('id')
      .trim()
      .notEmpty().withMessage('Falta el id del producto')
      .bail()
      .isInt({ min: 1 }).withMessage('El id debe ser un entero ≥ 1')
      .toInt(),
  ], validarCampos, eliminarProducto);


export default router;