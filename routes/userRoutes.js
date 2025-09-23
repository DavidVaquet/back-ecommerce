import express from 'express';
import { adminEditUser, eliminarUsuario, cerrarSession, cerrarTodasSessiones, editUser, getRecentActivity, getUsageStats, loginUsuario, newUser, obtenerSessiones, obtenerUsuarios, updateUserPassword, userInfo } from '../controllers/UsersControllers.js';
import { verifyToken } from '../middlewares/authMiddlewares.js';

const router = express.Router();

router.post('/register', newUser);
router.post('/login', loginUsuario);
router.get('/user-info', verifyToken, userInfo);
router.get('/obtener-usuarios', verifyToken, obtenerUsuarios);
router.get('/recent-activity', verifyToken, getRecentActivity);
router.get('/stats-usage', verifyToken, getUsageStats);
router.get('/user-sessions', verifyToken, obtenerSessiones);
router.put('/edit-user-info', verifyToken, editUser);
router.put('/edit-user/:id', verifyToken, adminEditUser);
router.patch('/update-password', verifyToken, updateUserPassword);
router.delete('/close-session/:id', verifyToken, cerrarSession);
router.delete('/close-all-session', verifyToken, cerrarTodasSessiones);
router.delete('/delete-user/:id', verifyToken, eliminarUsuario);


export default router;