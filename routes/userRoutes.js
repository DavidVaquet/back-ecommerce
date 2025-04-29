import express from 'express';
import { newUser } from '../controllers/UsersControllers.js';

const router = express.Router();

router.post('/register', newUser);


export default router;