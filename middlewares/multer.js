import path from 'path';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';

const MAX_SIZE = 2* 1024 * 1024;
const extensionesPermitidas = ['.jpg', '.jpeg', '.webp', '.png'];

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
        cb(null, ('uploads/'))
    },
    filename: function(req, file, cb) {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = uuidv4() + ext;
        cb(null, uniqueName);
    }
    });

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!extensionesPermitidas.includes(ext)){
        cb(new Error('Tipo de extensión invalida'), false);
    }
    cb(null, true)
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: MAX_SIZE
    }
});