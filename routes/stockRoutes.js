import express from 'express';
import { addStock, getStockId, reduceStock } from '../controllers/StockController.js';

const router = express.Router();

router.get('/getStock/:id', getStockId);
router.patch('/addStock/:productId', addStock);
router.patch('/reduceStock/:productId', reduceStock);


export default router;