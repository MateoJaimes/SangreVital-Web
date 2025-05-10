const express = require('express');
const router = express.Router();


// Importar todas las rutas
const authRoutes = require('./authRoutes');
const apiRoutes = require('./apiRoutes');

// Configurar rutas
router.use('/', authRoutes);       // Rutas principales y de autenticación
router.use('/api', apiRoutes);    // Rutas de API (empiezan con /api)

module.exports = router;