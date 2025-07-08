import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pool from './config/db.js';
import productRoutes from './routes/productRoutes.js';
import stockRoutes from './routes/stockRoutes.js';
import categoriesRoutes from './routes/categoriesRoutes.js';
import userRoutes from './routes/userRoutes.js';
import subcategoriesRoutes from './routes/subcategoriesRoutes.js';
import ventasRoutes from './routes/ventasRoutes.js';
import clientesRoutes from './routes/clientesRoutes.js';
import jwt from 'jsonwebtoken';
import path from 'path';

const app = express();
dotenv.config();

// Middlewares

app.use(cors());
app.use(express.json());

// Rutas
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/api/products', productRoutes);
app.use('/api/stock', stockRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/subcategories', subcategoriesRoutes);
app.use('/api/users', userRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/clientes', clientesRoutes);
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