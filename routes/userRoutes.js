import express from 'express';
import { loginUsuario, newUser } from '../controllers/UsersControllers.js';
import { verifyToken } from '../middlewares/authMiddlewares.js';

const router = express.Router();

router.post('/register', newUser);
router.post('/login', verifyToken, loginUsuario);


export default router;