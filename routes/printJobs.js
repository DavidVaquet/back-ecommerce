import { Router } from 'express';
import { body, query, param } from 'express-validator';
import { createPrintJobMinimal, listPrintJobs, getPrintJob } from '../controllers/PrintJobs.js';
import { verifyToken } from '../middlewares/authMiddlewares.js';
import { validarCampos } from '../utils/validaciones.js';
const router = Router();

router.post('/',
  verifyToken,
  body('width_mm').exists({ values: 'falsy' }).withMessage('width_mm es obligatorio').bail().toInt(),
  body('height_mm').exists({ values: 'falsy' }).withMessage('height_mm es obligatorio').bail().toInt(),
  body('copies').optional({ values: 'falsy' }).toInt(),
  body('producto').exists().withMessage('producto es obligatorio').bail().isObject(),
  validarCampos,
  createPrintJobMinimal
);

router.get('/',
  verifyToken,
  query('status').optional().isIn(['queued','claimed','completed','failed','canceled']),
  query('limit').optional().toInt(),
  query('offset').optional().toInt(),
  validarCampos,
  listPrintJobs
);

router.get('/:id',
  verifyToken,
  param('id').isUUID(),
  validarCampos,
  getPrintJob
);

export default router;
