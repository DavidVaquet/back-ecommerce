import express from 'express';
import { getCategories, newCategory, editCategory, categoryState, obtenerCategoriasSubcategorias, statsCategorias, eliminarCategoria } from '../controllers/CategoriesController.js';
import { verifyAdmin, verifyRole, verifyToken, requireActiveSession, touchSession } from '../middlewares/authMiddlewares.js';
import { validarCampos } from '../utils/validaciones.js';
import { body, param, query } from 'express-validator';

const router = express.Router();


router.get('/getCategories', 
        [query('activo')
        .optional()
        .isIn(['true', 'false', true, false])
        .withMessage('El parametro activo debe ser true o false')
        .toBoolean(),
        validarCampos
        ], getCategories);
router.post('/createCategory', verifyToken, requireActiveSession, touchSession, verifyAdmin,
    [body('nombre')
        .exists({values: 'falsy'})
        .withMessage('Debes introducir un nombre.')
        .isLength({ min: 3}).withMessage('El nombre debe tener al menos 3 caracteres.'),
        body('activo')
        .notEmpty().
        isIn(['true', 'false', true, false])
        .withMessage('El estado de categoria debe ser true o false')
        .toBoolean(),
        validarCampos], newCategory);

router.patch('/editCategory/:id', verifyToken,  requireActiveSession, touchSession, verifyAdmin, [
        param('id').toInt(),
        body('nombre').trim().notEmpty().withMessage('Debes introducir un nombre'),
        body('visible').toInt().isIn([0, 1]).withMessage('Visible debe ser activo o inactivo'),
        body('activo').isIn(['true', 'false']).withMessage('Activo debe ser true o false').toBoolean(),
        validarCampos
], editCategory);



router.delete('/delete-category/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
        param('id').toInt(),
        validarCampos
], eliminarCategoria)

router.get('/get-categories-subcategories', verifyToken, verifyAdmin, obtenerCategoriasSubcategorias);
router.get('/get-stats-categories-subcategories', verifyToken, verifyAdmin, statsCategorias);


export default router;