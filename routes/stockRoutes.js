import express from 'express';
import { addStock, getStockId } from '../controllers/StockController.js';

const router = express.Router();

router.get('/getStock/:id', getStockId);
router.patch('/addStock/:productId', addStock);



export default router;