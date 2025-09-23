import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import categoriesRoutes from './routes/categoriesRoutes.js';
import userRoutes from './routes/userRoutes.js';
import subcategoriesRoutes from './routes/subcategoriesRoutes.js';
import ventasRoutes from './routes/ventasRoutes.js';
import clientesRoutes from './routes/clientesRoutes.js';
import recibosRoutes from './routes/recibosRoutes.js';
import impresoraRoutes from './routes/impresoraRoutes.js'
import stockRoutes from './routes/stockRoutes.js';
import estadisticasRoutes from './routes/estadisticasRoutes.js';
import reportesRoutes from './routes/reportesRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';
import jwt from 'jsonwebtoken';
import path from 'path';

const app = express();
dotenv.config();

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares

app.use(cors({
  origin: 'http://localhost:5173',
  allowedHeaders: ['Content-Type', 'Authorization'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
}));
app.use(express.json());
// app.use((req, res, next) => {
//   const origJson = res.json.bind(res);
//   res.json = (...args) => {
//     if (res.headersSent) {
//       console.warn('⚠️ DOUBLE SEND', req.method, req.originalUrl, new Error().stack);
//       return;
//     }
//     return origJson(...args);
//   };
//   next();
// });

// Rutas
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/subcategories', subcategoriesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/recibos', recibosRoutes);
app.use('/api/impresora', impresoraRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/estadisticas', estadisticasRoutes);
app.use('/api/reportes', reportesRoutes);
app.get('/generate-test-token', (req, res) => {
  const token = jwt.sign({ id: 1, rol: 'admin' }, process.env.JWT_PASSWORD, { expiresIn: '30d' });
  res.json({ token });
});

app.listen(process.env.PORT, () => {
    console.log('Servidor corriendo en el puerto', process.env.PORT);
});

try {
    const result = await pool.query('SELECT NOW()');
    console.log('Base de datos conectada', result.rows[0].now);
} catch (error) {
    console.error('Error al conectar la base de datos', error.message);    
};