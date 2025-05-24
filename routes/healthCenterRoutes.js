const express = require('express');
const router = express.Router();
const healthCenterController = require('../controllers/healthCenterController');
const { ensureHealthCenterAuthenticated } = require('../middlewares/authMiddleware');

// Login form
router.get('/login', healthCenterController.getLogin);
// Login POST
router.post('/login', healthCenterController.postLogin);
// Dashboard (protegido)
router.get('/dashboard', ensureHealthCenterAuthenticated, healthCenterController.getDashboard);
// Logout
router.get('/logout', healthCenterController.logout);
// Petición de sangre
router.post('/request-blood', ensureHealthCenterAuthenticated, healthCenterController.requestBlood);
// Buscar donantes
router.get('/search-donors', ensureHealthCenterAuthenticated, healthCenterController.searchDonors);
// Solicitar donación a un donante específico
router.post('/request-donor/:donorId', ensureHealthCenterAuthenticated, healthCenterController.requestDonor);

module.exports = router;