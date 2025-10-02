import express from 'express';
import { addSubcategoria, getAllSubcategorias } from '../controllers/SubcategoriesController.js';
import { verifyToken, requireActiveSession, touchSession } from '../middlewares/authMiddlewares.js';
import { body, query } from 'express-validator';
import { validarCampos } from '../utils/validaciones.js';

const router = express.Router();

router.post('/newSubcategory', verifyToken, requireActiveSession, touchSession, [
    body('nombre').exists({ values: 'falsy'}).withMessage('El campo nombre es obligatorio').bail(),
    body('activo').exists({ values: ['', null]}).withMessage('El campo estado es obligatorio').bail().isIn(['true', 'false']).withMessage('El campo estado debe ser activo o inactivo').toBoolean(),
    body('categoria_id').exists({ values: ['' , null] }).withMessage('Debes seleccionar una categoría').bail().isInt({ min: 1 }).withMessage('La categoría debe ser un número entero mayor a 0')
    .toInt(),
    validarCampos
], addSubcategoria);

router.get('/getSubcategories', [
    query('activo').optional().isIn(['true', 'false', true, false]).withMessage('El estado debe ser true o false').bail().toBoolean(),
    validarCampos
], getAllSubcategorias);

export default router;