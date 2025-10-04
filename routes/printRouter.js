import express from 'express';
import { v4 } from 'uuid';
import { printApiKey } from '../middlewares/printKey';

export const clients = new Map();
export const pendingJobs = new Map(); 
const router = express.Router();

router.post('/', printApiKey, async (req, res) => {
    const { clientId, data, mode, printer, shareHost, shareName } = req.body || {};
    if (!clientId || !data || !mode) {
    return res.status(400).json({ msg: 'Faltan campos: clientId, data, mode' });
    }

    const job = {
        id: v4(),
        type: 'print',
        payload: { data, mode, printer, shareHost, shareName }
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