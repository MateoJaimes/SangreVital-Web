const db = require('../config/db');
const bcrypt = require('bcrypt');

// Mostrar formulario de registro
exports.showRegisterForm = (req, res) => {
  res.render('register', { error: null, formData: {} });
};

// Procesar registro de usuario
exports.registerUser = async (req, res) => {
  const { id, email, password } = req.body;

  if (!password || password.length < 8) {
    return res.render('register', {
      error: 'La contraseña debe tener al menos 8 caracteres.',
      formData: req.body,
    });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      `INSERT INTO user_credentials (id, email, password) 
       VALUES (UPPER($1), UPPER($2), $3)`,
      [id, email, hashedPassword]
    );

    // Crear sesión mínima para permitir acceso a complete-profile
    req.session.donor = { id, email };

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
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.render('login', { error: 'Credenciales incorrectas' });
    }

    // Combinar datos de user_credentials y donors
    const donorResult = await db.query(
      `SELECT d.*, uc.email 
       FROM donors d 
       JOIN user_credentials uc ON d.id = uc.id 
       WHERE d.id = $1`,
      [id]
    );

    if (donorResult.rows.length === 0) {
      // Si existe el usuario pero no el donante, redirigir a completar perfil
      req.session.donor = { id, email: user.email }; // Permitir acceso a complete-profile
      return res.redirect(`/complete-profile/${id}`);
    }

    const donor = donorResult.rows[0];
    req.session.donor = donor;

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
exports.showCompleteProfileForm = async (req, res) => {
  const { id } = req.params;
  try {
    // Obtener todos los estados
    const statesResult = await db.query('SELECT code_state, name_state FROM states ORDER BY name_state');
    // Obtener todas las ciudades
    const citiesResult = await db.query('SELECT code_city, name_city, code_state FROM cities ORDER BY name_city');
    res.render('complete-profile', {
      userId: id,
      error: null,
      states: statesResult.rows,
      cities: citiesResult.rows
    });
  } catch (error) {
    res.render('complete-profile', { userId: id, error: 'Error cargando estados/ciudades', states: [], cities: [] });
  }
};

// Guardar datos del donante
exports.saveDonanteData = async (req, res) => {
  const {
    id, first_name, second_name, last_name, second_last_name,
    gender, blood_type, birth_date, address, code_city // state is ignored
  } = req.body;

  try {
    // Verificar si el donante ya existe
    const donorExists = await db.query('SELECT 1 FROM donors WHERE id = $1', [id]);

    if (donorExists.rows.length === 0) {
      // INSERT en donors
      await db.query(`INSERT INTO donors (
        id, first_name, second_name, last_name, second_last_name, gender, blood_type, birth_date, address, code_city
      ) VALUES (
        UPPER($1), UPPER($2), UPPER($3), UPPER($4), UPPER($5), $6, UPPER($7), $8, UPPER($9), UPPER($10)
      )`,
        [id, first_name, second_name, last_name, second_last_name, gender, blood_type, birth_date, address, code_city]
      );
    } else {
      // UPDATE si ya existe (opcional)
      await db.query(`UPDATE donors SET
        first_name = UPPER($1), second_name = UPPER($2), last_name = UPPER($3),
        second_last_name = UPPER($4), gender = $5, blood_type = UPPER($6),
        birth_date = $7, address = UPPER($8), code_city = UPPER($9),
        updated_at = CURRENT_TIMESTAMP
        WHERE id = UPPER($10)`,
        [first_name, second_name, last_name, second_last_name, gender, blood_type, birth_date, address, code_city, id]
      );
    }

    // Obtener el donante actualizado y crear sesión
    const result = await db.query('SELECT * FROM donors WHERE id = $1', [id]);
    req.session.donor = result.rows[0];
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error guardando donante:', error);
    res.render('complete-profile', {
      userId: id,
      error: 'Error al guardar los datos del donante.'
    });
  }
};

// Mostrar dashboard (sin borrar sesión)
exports.showDashboard = (req, res) => {
  const donor = req.session.donor;
  res.render('dashboard', { donor });
};

// Mostrar formulario de edición de perfil
exports.showEditProfileForm = async (req, res) => {
  const donor = req.session.donor;
  if (!donor) return res.redirect('/login');
  try {
    const statesResult = await db.query('SELECT code_state, name_state FROM states ORDER BY name_state');
    const citiesResult = await db.query('SELECT code_city, name_city, code_state FROM cities ORDER BY name_city');
    res.render('edit-profile', { donor, error: null, states: statesResult.rows, cities: citiesResult.rows });
  } catch (error) {
    res.render('edit-profile', { donor, error: 'Error cargando estados/ciudades', states: [], cities: [] });
  }
};

// Procesar edición del perfil
exports.updateProfile = async (req, res) => {
  const {
    id, first_name, second_name, last_name, second_last_name,
    blood_type, birth_date, address, code_city // <-- fix aquí
  } = req.body;

  try {
    await db.query(`UPDATE donors SET
        first_name = UPPER($1), second_name = UPPER($2), last_name = UPPER($3), 
        second_last_name = UPPER($4), blood_type = UPPER($5), 
        birth_date = $6, address = UPPER($7), code_city = UPPER($8),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = UPPER($9)`,
      [first_name, second_name, last_name, second_last_name, blood_type, birth_date, address, code_city, id]
    );

    const result = await db.query('SELECT * FROM donors WHERE id = $1', [id]);
    req.session.donor = result.rows[0];
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error actualizando perfil:', error);
    res.render('edit-profile', {
      donor: req.body,
      error: 'Error al actualizar el perfil.'
    });
  }
};

// Mostrar formulario de cuestionario de salud
exports.showHealthQuestionnaireForm = (req, res) => {
  const userId = req.session.donor?.id;
  if (!userId) return res.redirect('/login');
  res.render('health-questionnaire', { userId, error: null });
};

// Guardar cuestionario de salud
exports.saveHealthQuestionnaire = async (req, res) => {
  const userId = req.session.donor?.id;
  if (!userId) return res.redirect('/login');
  // Recoger todos los campos del formulario
  const data = { ...req.body, id: userId };
  try {
    // Inserta o actualiza el cuestionario de salud
    await db.query(`
      INSERT INTO health_questionnaire (
        id, feels_good, had_fever, had_covid, current_medications, pregnant, recently_vaccinated, vaccine_type, vaccine_date,
        chronic_conditions, hepatitis, hiv, tuberculosis, recent_surgeries, surgery_date, received_blood_transfusion, serious_conditions,
        traveled_risk_area, visited_countries, last_travel_date, risky_sexual_behaviors, tattoos_or_piercings, tattoo_date, intravenous_drugs, contact_with_diseases,
        donated_before, last_donation_date, had_reactions, reaction_type
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28
      )
      ON CONFLICT (id) DO UPDATE SET
        feels_good = $2, had_fever = $3, had_covid = $4, current_medications = $5, pregnant = $6, recently_vaccinated = $7, vaccine_type = $8, vaccine_date = $9,
        chronic_conditions = $10, hepatitis = $11, hiv = $12, tuberculosis = $13, recent_surgeries = $14, surgery_date = $15, received_blood_transfusion = $16, serious_conditions = $17,
        traveled_risk_area = $18, visited_countries = $19, last_travel_date = $20, risky_sexual_behaviors = $21, tattoos_or_piercings = $22, tattoo_date = $23, intravenous_drugs = $24, contact_with_diseases = $25,
        donated_before = $26, last_donation_date = $27, had_reactions = $28, reaction_type = $29, updated_at = CURRENT_TIMESTAMP
    `,[
      userId,
      data.feels_good ? true : false,
      data.had_fever ? true : false,
      data.had_covid ? true : false,
      data.current_medications || null,
      data.pregnant ? true : false,
      data.recently_vaccinated ? true : false,
      data.vaccine_type || null,
      data.vaccine_date || null,
      data.chronic_conditions || null,
      data.hepatitis ? true : false,
      data.hiv ? true : false,
      data.tuberculosis ? true : false,
      data.recent_surgeries ? true : false,
      data.surgery_date || null,
      data.received_blood_transfusion ? true : false,
      data.serious_conditions || null,
      data.traveled_risk_area ? true : false,
      data.visited_countries || null,
      data.last_travel_date || null,
      data.risky_sexual_behaviors ? true : false,
      data.tattoos_or_piercings ? true : false,
      data.tattoo_date || null,
      data.intravenous_drugs ? true : false,
      data.contact_with_diseases ? true : false,
      data.donated_before ? true : false,
      data.last_donation_date || null,
      data.had_reactions ? true : false,
      data.reaction_type || null
    ]);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Error guardando cuestionario de salud:', error);
    res.render('health-questionnaire', { userId, error: 'Error al guardar el cuestionario de salud.' });
  }
};

// Logout
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
};
