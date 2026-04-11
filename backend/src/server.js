require('dotenv').config();
const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');

console.log('🔍 Iniciando servidor con logs detallados...');
console.log('📋 Variables de entorno cargadas:');
console.log('   PORT:', process.env.PORT);
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   MONGO_URI:', process.env.MONGO_URI ? '✅ Presente' : '❌ Faltante');
console.log('   SESSION_SECRET:', process.env.SESSION_SECRET ? '✅ Presente' : '❌ Faltante');

mongoose.set('debug', true);
mongoose.set('strictQuery', false);

const requestLogger = (req, res, next) => {
    console.log('📨 Request:', {
        method: req.method,
        url: req.url,
        body: req.body,
        time: new Date().toISOString()
    });
    next();
};

const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products');
const salesRoutes = require('./routes/sales');
const inventoryRoutes = require('./routes/inventory');
const reviewRoutes = require('./routes/reviews');
const mercadopagoRoutes = require('./routes/mercadopago');
const ticketRoutes = require('./routes/tickets');
const { corsDynamicOrigin } = require('./config/corsOrigins');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(requestLogger);
app.use(helmet());
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: corsDynamicOrigin(),
    credentials: true
}));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200
}));

app.use(session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'fallback_secret_usa_una_clave_real_en_env',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
        mongoUrl: process.env.MONGO_URI,
        collectionName: 'sessions'
    }),
    cookie: {
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 1000 * 60 * 60 * 24
    }
}));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/mercadopago', mercadopagoRoutes);
app.use('/api/tickets', ticketRoutes);

app.get('/api/health', (req, res) => {
    console.log('✅ Health check recibido');
    res.json({
        message: 'Server is running',
        timestamp: new Date().toISOString(),
        database: mongoose.connection.readyState === 1 ? '✅ Connected' : '❌ Disconnected'
    });
});

app.post('/api/test/register', async (req, res) => {
    console.log('🧪 Test register endpoint hit', req.body);
    try {
        res.json({
            success: true,
            message: 'Test endpoint working',
            dataReceived: req.body
        });
    } catch (error) {
        console.error('❌ Test error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.use((err, req, res, next) => {
    console.error('🔥 Error no manejado:', err);
    res.status(500).json({
        error: 'Error interno del servidor',
        message: err.message
    });
});

app.use((req, res) => {
    console.log('❌ Ruta no encontrada:', req.originalUrl);
    res.status(404).json({ error: 'Ruta no encontrada' });
});

async function connectDB() {
    try {
        console.log('🔄 Intentando conectar a MongoDB...');
        const uri = process.env.MONGO_URI;

        if (!uri) {
            throw new Error('❌ MONGO_URI no definido en .env');
        }

        console.log('🔗 URI de MongoDB:', uri);

        await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000
        });

        console.log('✅ MongoDB conectado exitosamente');

        const { runRolesBootstrap } = require('./bootstrap/rolesAndAdmin');
        await runRolesBootstrap();
    } catch (error) {
        console.error('❌ Error crítico conectando a MongoDB:');
        console.error('   - Mensaje:', error.message);
        console.error('   - Code:', error.code);
        console.error('   - Name:', error.name);

        if (error.code === 'ENOTFOUND') {
            console.error('   🔍 Problema de DNS - verifica la URL de MongoDB');
        } else if (error.code === 'ETIMEDOUT') {
            console.error('   ⏰ Timeout - verifica tu conexión a internet');
        }

        process.exit(1);
    }
}

async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log('\n🎉 ====================================');
            console.log('✅ Servidor ejecutándose en http://localhost:' + PORT);
            console.log('🔍 Health check: http://localhost:' + PORT + '/api/health');
            console.log('📦 Productos:   http://localhost:' + PORT + '/api/products');
            console.log('====================================\n');
        });
    } catch (error) {
        console.error('❌ Error fatal al iniciar el servidor:', error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    console.log('\n🛑 Cerrando servidor...');
    await mongoose.connection.close();
    process.exit(0);
});

startServer();
