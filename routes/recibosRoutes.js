// routes/recibos.routes.js
import { Router } from "express";
import {
  generarReciboVenta,
  enviarRecibo,
  descargarRecibo,
  verReciboInlineByCodigo,
  verReciboInlinePorLink,
  enviarEmail,
} from "../controllers/ReciboController.js";
import { verifyToken } from "../middlewares/authMiddlewares.js";


const router = Router();

router.post("/recibos/generar", verifyToken, generarReciboVenta);


router.post("/recibos/enviar", verifyToken, enviarRecibo);

router.get("/recibos/by-codigo/:codigo", verifyToken, verReciboInlineByCodigo);
router.get("/recibos/link", verifyToken, verReciboInlinePorLink);

router.get("/recibos/download/:codigo", verifyToken, descargarRecibo);


router.post("/enviar-email", verifyToken, enviarEmail);

export default router;
