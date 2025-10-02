import express from 'express';
import { adminEditUser, eliminarUsuario, cerrarSession, cerrarTodasSessiones, editUser, getRecentActivity, getUsageStats, loginUsuario, newUser, obtenerSessiones, obtenerUsuarios, updateUserPassword, userInfo, forgotPassword, resetPassword } from '../controllers/UsersControllers.js';
import { verifyAdmin, verifyToken } from '../middlewares/authMiddlewares.js';
import { body } from 'express-validator';
import { validarCampos } from '../utils/validaciones.js';

const router = express.Router();

router.post('/register', [
    body('nombre').exists({ values: 'falsy'}).withMessage('El campo nombre es obligatorio').bail(),
    body('apellido').exists({ values: 'falsy'}).withMessage('El apellido nombre es obligatorio').bail(),
    body('email').exists({ values: 'falsy' }).withMessage('Debes introducir un email').bail().isEmail().withMessage('Debes introducir un email válido').bail(),
    body('password)').exists({ values: ['', null] }).withMessage('El campo contraseña es obligatorio').bail().isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres').bail(),
    validarCampos
], newUser);

router.post('/login', [
    body('email').exists({ values: 'falsy' }).withMessage('Debes introducir un email').bail().isEmail().withMessage('Debes introducir un email válido').bail(),
    body('password').exists({ values: 'falsy'}).withMessage('Debes introducir una contraseña').bail().isLength({min: 6}).withMessage('La contraseña debe tener al menos 6 caracteres').bail(),
    validarCampos
], loginUsuario);


router.post('/forgot-password', [
    body('email').exists({ values: 'falsy' }).withMessage('Debes introducir un email').bail().isEmail().withMessage('Debes introducir un email válido').bail(),
    validarCampos
], forgotPassword);


router.post('/reset-password-recovery', [
    body('password').exists({ values: 'falsy' }).withMessage('Debes introducir una contraseña').bail().isLength({ min: 6}).withMessage('La contraseña debe tener al menos 6 caracteres').bail(),
    validarCampos
], resetPassword);


router.put('/edit-user-info', verifyToken, [
    body('nombre').exists({ values: 'falsy' }).withMessage('Debes introducir un nombre').bail(),
    body('apellido').exists({ values: 'falsy' }).withMessage('Debes introducir un apellido').bail(),
    body('direccion').exists({ values: 'falsy' }).withMessage('Debes introducir una direccion').bail(),
    body('telefono').exists({ values: 'falsy' }).withMessage('Debes introducir un número de telefono').bail(),
    validarCampos
], editUser);


router.put('/edit-user/:id', verifyToken, verifyAdmin, [
    body('nombre').exists({ values: 'falsy' }).withMessage('Debes introducir un nombre').bail(),
    body('apellido').exists({ values: 'falsy' }).withMessage('Debes introducir un apellido').bail(),
    body('rol').exists({ values: ['', null] }).withMessage('Debes introducir un rol').bail().isIn(['admin', 'supervisor', 'vendedor']).withMessage('Rol inválido, debe ser uno de: admin, vendedor, supervisor'),
    validarCampos
], adminEditUser);


router.get('/user-info', verifyToken, userInfo);
router.get('/obtener-usuarios', verifyToken, obtenerUsuarios);
router.get('/recent-activity', verifyToken, getRecentActivity);
router.get('/stats-usage', verifyToken, getUsageStats);
router.get('/user-sessions', verifyToken, obtenerSessiones);
router.patch('/update-password', verifyToken, updateUserPassword);
router.delete('/close-session/:id', verifyToken, cerrarSession);
router.delete('/close-all-session', verifyToken, cerrarTodasSessiones);
router.delete('/delete-user/:id', verifyToken, eliminarUsuario);


export default router;