import { createUser, findUserByEmail } from "../models/userModel.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const newUser = async (req, res) => {

    const {nombre, email, password, rol} = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ msg: 'Nombre, email y password son obligatorios.' });
    };

    try {
        const userExistente = await findUserByEmail(email);
        if (userExistente){
            return res.status(400).json({ msg: 'Ya existe una cuenta con este email.'});
        };

        const passwordHash = await bcrypt.hash(password, 10);

        const nuevoUsuario = await createUser(nombre, email, passwordHash, rol);
        delete nuevoUsuario.password;

        return res.status(201).json({
            msg: 'Usuario creado con exito.',
            usuario: nuevoUsuario
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al crear un nuevo usuario.' });
    }
};