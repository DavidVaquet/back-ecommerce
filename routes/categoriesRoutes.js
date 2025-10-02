import express from 'express';
import { getCategories, newCategory, editCategory, categoryState } from '../controllers/CategoriesController.js';
import { verifyAdmin, verifyRole, verifyToken, requireActiveSession, touchSession } from '../middlewares/authMiddlewares.js';
import { validarCampos } from '../utils/validaciones.js';
import { body, query } from 'express-validator';

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
router.put('/editCategory/:id', verifyToken,  requireActiveSession, touchSession, verifyAdmin, editCategory );
router.patch('/toggleCategoryState/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, categoryState);


export default router;