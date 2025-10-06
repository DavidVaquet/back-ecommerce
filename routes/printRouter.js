import express from 'express';
import { v4 } from 'uuid';
import { printApiKey } from '../middlewares/printKey.js';
import { buildEtiquetaTSPL } from '../utils/tsplBuild.js';

export const clients = new Map();
export const pendingJobs = new Map(); 
const router = express.Router();

router.post('/', printApiKey, async (req, res) => {
    const { data, mode, printer, shareHost, shareName, producto, ancho, alto, copias } = req.body || {};
    if (!producto) {
    return res.status(400).json({ msg: 'Falta el producto que contiene el código de barra.' });
    }

    if (!mode) return res.status(400).json({ msg: 'Debes especificar el modo de impresión'});

    if (!ancho) return res.status(400).json({ msg: 'Debes especificar el ancho de la etiqueta'});
    if (!alto) return res.status(400).json({ msg: 'Debes especificar el alto de la etiqueta'});
    if (!copias) return res.status(400).json({ msg: 'Debes especificar la cantidad de copias'});

    const tsplData = producto ? buildEtiquetaTSPL(producto, ancho, alto, copias) : data;

    const clientId = process.env.DEFAULT_CLIENT_ID;

    const job = {
        id: v4(),
        type: 'print',
        payload: { data: tsplData, mode, printer, shareHost, shareName }
    };

    const ws = clients.get(clientId);
    if (ws && ws.readyState === ws.OPEN) {
        try {
            ws.send(JSON.stringify(job));
            return res.json({ ok: true, delivered: true, jobId: job.id });
        } catch  {

        }
    } 

    const list = pendingJobs.get(clientId) || [];
    list.push(job);
    pendingJobs.set(clientId, list);

    res.json({ ok:true, delivered: false, queued: true, jobId: job.id });

})

export default router;