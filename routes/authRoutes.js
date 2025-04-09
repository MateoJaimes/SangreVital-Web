const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { isAuthenticated } = require('../middlewares/authMiddleware');

// Página de inicio
router.get('/', (req, res) => res.render('index'));

// Registro
router.get('/register', authController.showRegisterForm);
router.post('/register', authController.registerUser);

// Login
router.get('/login', authController.showLoginForm);
router.post('/login', authController.loginUser);

// Logout
router.get('/logout', authController.logout);

// Dashboard (protegido)
router.get('/dashboard', isAuthenticated, authController.showDashboard);

// Completar perfil (en inglés)
router.get('/complete-profile/:id', authController.showCompleteProfileForm);
router.post('/complete-profile', authController.saveDonanteData);

module.exports = router;
