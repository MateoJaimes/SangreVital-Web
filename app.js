const express = require('express');
const session = require('express-session');
const path = require('path');
const app = express();
const authRoutes = require('./routes/authRoutes');
require('dotenv').config();

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public'))); // Única línea necesaria
app.use(session({
  secret: process.env.SESSION_SECRET || 'secreto', // Mejor usar variable de entorno
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } // Para desarrollo, en producción debería ser true con HTTPS
}));

// Rutas
app.use('/', authRoutes);

// Puerto
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor en http://localhost:${PORT}`));