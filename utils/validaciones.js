import { validationResult } from 'express-validator';


export const validarCampos = (req, res, next) => {

    const errors = validationResult(errors);

    if(!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    };

    next();

}