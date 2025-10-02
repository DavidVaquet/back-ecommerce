import { validationResult } from 'express-validator';


export const validarCampos = (req, res, next) => {

    const errors = validationResult(req);

    if(!errors.isEmpty()) {
        return res.status(400).json({ errores: errors.array() });
    };

    next();

}


export const normalizeMulterBody = (req, res, next) => {
  if (req.body && Object.getPrototypeOf(req.body) === null) req.body = { ...req.body };
  next();
};