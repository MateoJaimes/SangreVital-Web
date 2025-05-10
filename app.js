require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const apiRoutes = require('./routes/apiRoutes');


// 1. Configuración de EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Middlewares esenciales
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 3. Configuración de sesión
app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false,
    maxAge: 24 * 60 * 60 * 1000 // 1 día de duración
  }
}));

// 4. Importación de rutas (usando la nueva estructura)
const mainRouter = require('./routes'); // Esto cargará automáticamente routes/index.js

// 5. Configuración de rutas
app.use('/api', apiRoutes); // Esto debe estar ANTES de otras rutas
app.use('/', mainRouter);

// 6. Middleware para errores 404
app.use((req, res, next) => {
  res.status(404).render('error', { 
    title: 'Página no encontrada',
    message: 'La página que buscas no existe' 
  });
});

// 7. Middleware para manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', {
    title: 'Error del servidor',
    message: 'Algo salió mal en el servidor'
  });
});


app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// 8. Inicio del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
  console.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
});