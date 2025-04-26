import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
const app = express();
import productRoutes from './routes/productRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
dotenv.config();

// Middlewares

app.use(cors());
app.use(express.json());

// Rutas

app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);

app.listen(process.env.PORT, () => {
    console.log('Servidor corriendo en el puerto', process.env.PORT);
});

try {
    const result = await pool.query('SELECT NOW()');
    console.log('Base de datos conectada', result.rows[0].now);
} catch (error) {
    console.error('Error al conectar la base de datos', error.message);    
}