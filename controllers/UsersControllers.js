import { createUser, findUserByEmail } from "../models/userModel.js";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const newUser = async (req, res) => {

    const {nombre, email, password, rol, activo} = req.body;

    if (!nombre || !email || !password) {
        return res.status(400).json({ msg: 'Nombre, email y password son obligatorios.' });
    };

    try {
        const userExistente = await findUserByEmail(email);
        if (userExistente){
            return res.status(400).json({ msg: 'Ya existe una cuenta con este email.'});
        };

        const passwordHash = await bcrypt.hash(password, 10);

        const nuevoUsuario = await createUser({nombre, email, passwordHash, rol, activo});
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



export const loginUsuario = async (req, res) => {

    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ msg: 'Email y password son obligatorios.'})
    };

    try {
        
        const usuario = await findUserByEmail(email);
        if (!usuario) {
            return res.status(404).json({ msg: 'Usuario no encontrado.' })
        };

        const passwordValido = await bcrypt.compare(password, usuario.password);
        if (!passwordValido){
            return res.status(400).json({ msg: 'El password es incorrecto.'})
        };

        const token = jwt.sign(
            {id: usuario.id, rol: usuario.rol},
            process.env.JWT_PASSWORD,
            {expiresIn: '3h'}
        );

        delete usuario.password;

        return res.status(200).json({
            msg: 'Login exitoso.',
            usuario,
            token
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al iniciar sesion'} );
    }



}