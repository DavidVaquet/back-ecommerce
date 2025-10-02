import express from 'express';
import { clientesConCompras, crearCliente, suspenderCliente, modificarCliente, clientesEstado, estadisticasClientes } from '../controllers/ClientesController.js';
import { verifyToken, verifyRole, requireActiveSession, touchSession, verifyAdmin } from '../middlewares/authMiddlewares.js';
import { body, query } from 'express-validator';
import { validarCampos } from '../utils/validaciones.js';

const router = express.Router();

router.post('/alta-cliente', verifyToken, [
    body('nombre')
    .exists({ values: 'falsy'})
    .withMessage('El campo nombre es obligatorio')
    .isLength({ min: 3})
    .withMessage('Debes introducir al menos 3 caracteres'),
    body('apellido')
    .exists({ values: 'falsy'})
    .withMessage('El campo apellido es obligatorio')
    .isLength({ min: 3})
    .withMessage('Debes introducir al menos 3 caracteres'),
    body('email')
    .exists({ values: 'falsy' }).withMessage('Debes introducir un email')
    .isEmail()
    .withMessage('Debes introducir un email válido'),
    body('telefono')
    .exists({ values: 'falsy'})
    .isLength({ min: 5})
    .withMessage('Debes introducir al menos 5 caracteres.'),
    validarCampos
    ], crearCliente);

router.get('/obtener-clientes', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    query('activo')
    .optional()
    .isIn(['true', 'false', true, false])
    .withMessage('El estado debe ser activo o inactivo.')
    .toBoolean(),
    query('limite')
    .optional()
    .isIn({ min: 1})
    .withMessage('El limite debe ser un número igual o mayor a 1')
    .toInt(),
    query('offset')
    .optional()
    .isInt({ min: 0})
    .withMessage('El offset debe ser un número igual o mayor a 0')
    .toInt(),
    query('search')
    .optional()
    .isString()
    .trim()
    .escape(),
    query('origen')
    .optional()
    .isIn(['manual', 'online'])
    .withMessage('El origen debe pertenecer a la tienda o al ecommerce'),
    query('tipo_cliente')
    .optional()
    .isIn(['regular', 'mayorista'])
    .withMessage('El cliente debe ser regular o mayorista'),
    validarCampos
], clientesEstado);

router.get('/obtener-estadisticas-clientes', verifyToken, requireActiveSession, touchSession, verifyAdmin, estadisticasClientes);
router.get('/obtener-clientes-compras', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    query('activo')
    .optional()
    .isIn(['true', 'false'])
    .withMessage('El estado debe ser activo o inactivo')
    .toBoolean(),
    query('origen')
    .optional()
    .isIn(['manual', 'online'])
    .withMessage('El origen debe pertenecer a la tienda o al ecommerce'),
    query('search')
    .optional()
    .isString()
    .trim()
    .escape(),
    query('limite')
    .optional()
    .isInt({ min: 1})
    .withMessage('El limite debe ser un número igual o mayor a 1')
    .toInt(),
    query('offset')
    .optional()
    .isInt({ min: 0})
    .withMessage('El offset debe ser un número igual o mayor a 0')
    .toInt(),
    query('tipo_cliente')
    .optional()
    .isIn(['regular', 'mayorista'])
    .withMessage('El cliente debe ser regular o mayorista'),
    validarCampos
], clientesConCompras);

router.patch('/suspender-cliente/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    body('email')
    .exists({ values: 'falsy' }).withMessage('Debes introducir un email')
    .isEmail()
    .withMessage('Debes introducir un email válido.'),
    body('estado')
    .exists({ values: 'null' })
    .withMessage('El estado es obligatorio')
    .bail()
    .isIn(['true', 'false', true, false])
    .withMessage('El estado debe ser activo o inactivo')
    .toBoolean(),
    validarCampos
], suspenderCliente);

router.put('/editar-cliente/:id', verifyToken, requireActiveSession, touchSession, verifyAdmin, [
    body('nombre').exists({ values: 'falsy'}).withMessage('El campo nombre es obligatorio').bail(),
    body('apellido').exists({ values: 'falsy'}).withMessage('El campo apellido es obligatorio').bail(),
    body('telefono').exists({ values: 'falsy'}).withMessage('El campo telefono es obligatorio').bail(),
    validarCampos
], modificarCliente);
    
export default router;