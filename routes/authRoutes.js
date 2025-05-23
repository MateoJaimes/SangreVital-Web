require('dotenv').config();
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middlewares/authMiddleware');
const db = require('../config/db');

// Página de inicio
router.get('/', async (req, res) => {
    try {
        const result = await db.query('SELECT name, address, code_city, contact_phone FROM health_centers');
        const healthCenters = result.rows;
        res.render('index', { healthCenters });
    } catch (error) {
        console.error('Error fetching health centers:', error);
        res.render('index', { healthCenters: [] });
    }
});

// Registro
router.get('/register', authController.showRegisterForm);
router.post('/register', authController.registerUser);

// Login
router.get('/login', authController.showLoginForm);
router.post('/login', authController.loginUser);

// Logout
router.get('/logout', authController.logout);

// Completar perfil
router.get('/complete-profile/:id', authController.showCompleteProfileForm);
router.post('/complete-profile', isAuthenticated, authController.saveDonanteData);

// Editar perfil
router.get('/edit-profile', isAuthenticated, authController.showEditProfileForm);
router.post('/edit-profile', isAuthenticated, authController.updateProfile);

// Dashboard
router.get('/dashboard', isAuthenticated, (req, res, next) => {
    authController.showDashboard(req, res, next);
});

// Health Questionnaire
router.get('/health-questionnaire', isAuthenticated, authController.showHealthQuestionnaireForm);
router.post('/health-questionnaire', isAuthenticated, authController.saveHealthQuestionnaire);

module.exports = router;