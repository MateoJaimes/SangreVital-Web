const express = require('express');
const router = express.Router();


// Importar todas las rutas
const authRoutes = require('./authRoutes');
const apiRoutes = require('./apiRoutes');
const healthCenterRoutes = require('./healthCenterRoutes');

// Configurar rutas
router.use('/', authRoutes);       // Rutas principales y de autenticación
router.use('/api', apiRoutes);    // Rutas de API (empiezan con /api)
router.use('/health-center', healthCenterRoutes); // Rutas de centros de salud (empiezan con /health-center)

module.exports = router;