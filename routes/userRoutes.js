import express from 'express';
import { cerrarSession, cerrarTodasSessiones, editUser, getRecentActivity, getUsageStats, loginUsuario, newUser, obtenerSessiones, updateUserPassword, userInfo } from '../controllers/UsersControllers.js';
import { verifyToken } from '../middlewares/authMiddlewares.js';

const router = express.Router();

router.post('/register', newUser);
router.post('/login', loginUsuario);
router.get('/user-info', verifyToken, userInfo);
router.get('/recent-activity', verifyToken, getRecentActivity);
router.get('/stats-usage', verifyToken, getUsageStats);
router.get('/user-sessions', verifyToken, obtenerSessiones);
router.put('/edit-user-info', verifyToken, editUser);
router.patch('/update-password', verifyToken, updateUserPassword);
router.delete('/close-session/:id', verifyToken, cerrarSession);
router.delete('/close-all-session', verifyToken, cerrarTodasSessiones);


export default router;