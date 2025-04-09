const db = require('../config/db');

// Mostrar formulario de registro
exports.showRegisterForm = (req, res) => {
  res.render('register', { error: null, formData: {} });
};

// Procesar registro de usuario
exports.registerUser = async (req, res) => {
  const { id_usuario, correo, contrasena } = req.body;

  try {
    const result = await db.query(
      'INSERT INTO usuarios (id_usuario, usuario_email, usuario_password) VALUES ($1, $2, $3) RETURNING *',
      [id_usuario, correo, contrasena]
    );

    const nuevoUsuario = result.rows[0];
    res.redirect(`/complete-profile/${nuevoUsuario.id_usuario}`);
  } catch (error) {
    console.error('Error en registerUser:', error);
    res.render('register', {
      error: 'Error al registrar el usuario. Verifica los datos.',
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
  const { correo, contrasena } = req.body;

  try {
    const result = await db.query(
      'SELECT * FROM usuarios WHERE usuario_email = $1 AND usuario_password = $2',
      [correo, contrasena]
    );

    if (result.rows.length === 0) {
      return res.render('login', { error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];

    const donanteResult = await db.query(
      'SELECT * FROM donantes WHERE id_usuario = $1',
      [usuario.id_usuario]
    );

    if (donanteResult.rows.length > 0) {
      const donante = donanteResult.rows[0];
      res.render('dashboard', { donante });
    } else {
      res.redirect(`/complete-profile/${usuario.id_usuario}`);
    }
  } catch (error) {
    console.error('Error en loginUser:', error);
    res.render('login', { error: 'Ocurrió un error al iniciar sesión.' });
  }
};

// Mostrar formulario para completar perfil
exports.showCompleteProfileForm = (req, res) => {
  const { id } = req.params;
  res.render('complete-profile', { userId: id });
};

// Guardar datos del donante
exports.saveDonanteData = async (req, res) => {
  const {
    user_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
    tipo_sangre, fecha_nacimiento, direccion, telefono
  } = req.body;

  try {
    await db.query(`
      INSERT INTO donantes (
        user_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
        tipo_sangre, fecha_nacimiento, direccion, telefono
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
    `, [
      user_id, primer_nombre, segundo_nombre, primer_apellido, segundo_apellido,
      tipo_sangre, fecha_nacimiento, direccion, telefono
    ]);

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error guardando donante:', error);
    res.render('complete-profile', {
      userId: user_id,
      error: 'Error al guardar los datos del donante.'
    });
  }
};


// Mostrar dashboard (dummy por ahora)
exports.showDashboard = (req, res) => {
  res.render('dashboard', { donante: null });
};

// Cerrar sesión
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};
