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

dotenv.config();
const app = express();

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares

const ALLOWED_ORIGINS = new Set([
  'https://iclubcatamarca.com',
  'https://www.iclubcatamarca.com',
  'http://localhost:5173'
]);

function isAllowed(origin) {
  try {
    if (!origin) return true;
    const url = new URL(origin);
    if (ALLOWED_ORIGINS.has(url.origin)) return true;
    if (url.hostname.endsWith('.iclubcatamarca.com')) return true;
    return false;
  } catch {
    return false;
  }
}

const corsOptions = {
  origin(origin, cb) {
    if (isAllowed(origin)) return cb(null, true);
    return cb(new Error(`Origin no permitido por CORS: ${origin || '(sin origin)'}`));
  },
  credentials: false,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  optionsSuccessStatus: 204,
};

app.use((req, res, next) => { res.header('Vary', 'Origin'); next(); });

app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    if (isAllowed(origin)) {
      res.header('Access-Control-Allow-Origin', origin || '*');
    }
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers'] || 'Content-Type, Authorization, X-Requested-With');
    res.header('Vary', 'Origin');
    return res.sendStatus(204);
  }
  next();
});

app.use(cors(corsOptions));
app.use(express.json());
app.set('trust proxy', 1);


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