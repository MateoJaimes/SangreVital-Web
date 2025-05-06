const db = require('../config/db');
const bcrypt = require('bcrypt'); // Importar bcrypt

// Mostrar formulario de registro
exports.showRegisterForm = (req, res) => {
  res.render('register', { error: null, formData: {} });
};

// Procesar registro de usuario
exports.registerUser = async (req, res) => {
  const { id, email, password } = req.body;

  // Validar contraseña
  if (!password || password.length < 8) {
    return res.render('register', {
      error: 'La contraseña debe tener al menos 8 caracteres.',
      formData: req.body,
    });
  }

  try {
    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insertar en user_credentials
    await db.query(
      `INSERT INTO user_credentials (id, email, password) 
       VALUES (UPPER($1), UPPER($2), $3)`,
      [id, email, hashedPassword]
    );

    // Insertar en donors
    await db.query(
      `INSERT INTO donors (id, first_name, last_name, blood_type, address, city, birth_date) 
       VALUES (UPPER($1), '', '', '', '', '', CURRENT_DATE)`,
      [id]
    );

    res.redirect(`/complete-profile/${id}`);
  } catch (error) {
    console.error('Error en registerUser:', error);

    const errorMessage =
      error.code === '23505'
        ? 'El usuario ya está registrado.'
        : 'Error al registrar el usuario. Verifica los datos.';

    res.render('register', {
      error: errorMessage,
      formData: req.body,
    });
  }
};

// Mostrar formulario de login
exports.showLoginForm = (req, res) => {
  res.render('login', { error: null });
};

// Procesar login de usuario
exports.loginUser = async (req, res) => {
  const { id, password } = req.body;

  try {
    const result = await db.query(
      'SELECT * FROM user_credentials WHERE id = $1',
      [id]
    );

    if (result.rows.length === 0) {
      return res.render('login', { error: 'Credenciales incorrectas' });
    }

    const user = result.rows[0];

    // Verificar la contraseña
    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.render('login', { error: 'Credenciales incorrectas' });
    }

    const donorResult = await db.query(
      'SELECT * FROM donors WHERE id = $1',
      [id]
    );

    if (donorResult.rows.length === 0) {
      return res.render('login', { error: 'No se encontró información del donante.' });
    }

    const donor = donorResult.rows[0];
    req.session.donor = donor; // Asegúrate de guardar el donante en la sesión

    if (!donor.first_name || !donor.blood_type) {
      return res.redirect(`/complete-profile/${donor.id}`);
    }

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error en loginUser:', error);
    res.render('login', { error: 'Ocurrió un error al iniciar sesión.' });
  }
};

// Mostrar formulario para completar perfil
exports.showCompleteProfileForm = (req, res) => {
  const { id } = req.params;
  res.render('complete-profile', { userId: id, error: null });
};

// Guardar datos del donante (completar perfil)
exports.saveDonanteData = async (req, res) => {
  const {
    id, first_name, second_name, last_name, second_last_name,
    blood_type, birth_date, address, city
  } = req.body;

  try {
    await db.query(`UPDATE donors SET
        first_name = UPPER($1), second_name = UPPER($2), last_name = UPPER($3), 
        second_last_name = UPPER($4), blood_type = UPPER($5), 
        birth_date = $6, address = UPPER($7), city = UPPER($8),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = UPPER($9)`,
      [first_name, second_name, last_name, second_last_name, blood_type, birth_date, address, city, id]
    );

    const result = await db.query('SELECT * FROM donors WHERE id = $1', [id]);
    const donor = result.rows[0];

    req.session.donor = donor;
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error guardando donante:', error);
    res.render('complete-profile', {
      userId: id,
      error: 'Error al guardar los datos del donante.'
    });
  }
};

// Mostrar dashboard
exports.showDashboard = (req, res) => {
  const donor = req.session.donor;
  req.session.donor = null; // Para limpiar después de usar
  res.render('dashboard', { donor });
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};
