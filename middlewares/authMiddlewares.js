import jwt from 'jsonwebtoken';

export const verifyToken = async (req, res, next) => {

    const autHeader = req.headers.authorization;

    if (!autHeader || !autHeader.startsWith('Bearer ')) {
        return res.status(404).json({ msg: 'Token no proporcionado.' })
    };

    const token = autHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_PASSWORD);
        req.usuario = decoded;

        next();

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: 'Error al validar el token.'});
    };
};


export const verifyAdmin = async (req, res, next) => {

    if (!req.usuario || !req.usuario.rol !== 'admin'){
        return res.status(401).json({ msg: 'Acceso denegado: Se requiere rol de administrador.'})
    };

    next();
};