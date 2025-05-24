const pool = require('../config/db');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

// Renderiza el login
exports.getLogin = (req, res) => {
    res.render('health-center-login');
};

// Procesa el login SOLO con tax_id
exports.postLogin = async (req, res) => {
    const { tax_id } = req.body;
    try {
        // JOIN para traer el nombre real de la ciudad
        const result = await pool.query(`
            SELECT hc.*, c.name_city
            FROM health_centers hc
            LEFT JOIN cities c ON hc.code_city = c.code_city
            WHERE hc.tax_id = $1
        `, [tax_id]);
        if (result.rows.length === 0) {
            return res.render('health-center-login', { error: 'NIT incorrecto o no registrado.' });
        }
        const healthCenter = result.rows[0];
        req.session.healthCenter = {
            id: healthCenter.id,
            name: healthCenter.name,
            tax_id: healthCenter.tax_id,
            address: healthCenter.address,
            city_name: healthCenter.name_city, // nombre real
            contact_phone: healthCenter.contact_phone
        };
        res.redirect('/health-center/dashboard');
    } catch (err) {
        console.error(err);
        res.render('health-center-login', { error: 'Error interno.' });
    }
};

// Renderiza el dashboard con departamentos y ciudades
exports.getDashboard = async (req, res) => {
    const healthCenter = req.session.healthCenter;
    if (!healthCenter) return res.redirect('/health-center/login');
    try {
        const statesResult = await pool.query('SELECT code_state, name_state FROM states ORDER BY name_state');
        const citiesResult = await pool.query('SELECT code_city, name_city, code_state FROM cities ORDER BY name_city');
        // Mostrar mensaje si viene ?solicitudHecha=1
        const solicitudHecha = req.query.solicitudHecha === '1';
        res.render('health-center-dashboard', { healthCenter, states: statesResult.rows, cities: citiesResult.rows, solicitudHecha });
    } catch (err) {
        console.error(err);
        res.render('health-center-dashboard', { healthCenter, states: [], cities: [], solicitudHecha: false });
    }
};

// Logout
exports.logout = (req, res) => {
    req.session.healthCenter = null;
    res.redirect('/health-center/login');
};

// Petición de sangre
exports.requestBlood = async (req, res) => {
    // Aquí deberías guardar la petición en la base de datos
    // Puedes implementar la lógica según tus necesidades
    res.redirect('/health-center/dashboard');
};

// Buscar donantes con lógica avanzada y soporte de departamento
exports.searchDonors = async (req, res) => {
    const { blood_type, city, state, age } = req.query;
    const healthCenter = req.session.healthCenter;
    // Query con JOINs y alias correctos
    let query = `
        SELECT 
            d.id,
            CONCAT_WS(' ', d.first_name, d.second_name, d.last_name, d.second_last_name) AS full_name,
            d.blood_type,
            d.gender,
            d.birth_date
        FROM donors d
        WHERE 1=1
    `;
    const params = [];
    if (blood_type) {
        params.push(blood_type);
        query += ` AND d.blood_type = $${params.length}`;
    }
    if (city) {
        params.push(String(city));
        query += ` AND d.code_city = $${params.length}`;
    } else if (state) {
        params.push(String(state));
        query += ` AND d.code_city IN (SELECT code_city FROM cities WHERE code_state = $${params.length})`;
    }
    // filtro de edad eliminado
    if (blood_type) {
        query += ` AND ${getBloodCompatibilitySQL('d.blood_type')}`;
    }
    query += ' ORDER BY full_name';
    // Obtener departamentos y ciudades para el select
    const statesResult = await pool.query('SELECT code_state, name_state FROM states ORDER BY name_state');
    const citiesResult = await pool.query('SELECT code_city, name_city, code_state FROM cities ORDER BY name_city');
    const donors = (await pool.query(query, params)).rows;
    res.render('health-center-dashboard', { healthCenter, donors, states: statesResult.rows, cities: citiesResult.rows });
};

// Enviar solicitud de donación a un donante específico
exports.requestDonor = async (req, res) => {
    const { donorId } = req.params;
    const healthCenter = req.session.healthCenter;
    if (!healthCenter) return res.redirect('/health-center/login');
    try {
        // Obtener email del donante
        const donorResult = await pool.query(`
            SELECT uc.email, d.first_name, d.last_name
            FROM donors d
            JOIN user_credentials uc ON d.id = uc.id
            WHERE d.id = $1
        `, [donorId]);
        if (donorResult.rows.length === 0) {
            return res.redirect('/health-center/dashboard');
        }
        const donor = donorResult.rows[0];
        // Enviar correo (requiere configuración de nodemailer)
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: donor.email,
            subject: 'Solicitud de donación de sangre',
            html: `
                <div style="font-family: 'Montserrat', Arial, sans-serif; background: #f8f9fa; padding: 0; margin: 0;">
                  <div style="max-width: 500px; margin: 40px auto; background: #fff; border-radius: 16px; box-shadow: 0 4px 20px rgba(220,53,69,0.10); overflow: hidden;">
                    <div style="background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); padding: 32px 24px 16px 24px; text-align: center;">
                      <img src="https://www.dropbox.com/scl/fi/jd25n5fft0e8ta11acraf/logo2.png?rlkey=wwq3lhtw7e4fxvofxh96s0let&st=3azub8m6&raw=1" alt="SangreVital" width="60" style="margin-bottom: 12px;"/>
                      <h2 style="color: #fff; margin: 0; font-weight: 700; letter-spacing: -1px;">Solicitud de Donación</h2>
                    </div>
                    <div style="padding: 32px 24px 24px 24px;">
                      <p style="font-size: 1.1rem; color: #333; margin-bottom: 18px;">Hola <b>${donor.first_name} ${donor.last_name}</b>,</p>
                      <p style="font-size: 1.05rem; color: #333;">El centro médico <b style='color:#dc3545'>${healthCenter.name}</b> solicita tu valiosa donación de sangre.</p>
                      <div style="background: #f8d7da; border-radius: 8px; padding: 16px; margin: 18px 0; color: #721c24;">
                        <b>Dirección del centro:</b><br>
                        <span style="color:#c82333">${healthCenter.address}, ${healthCenter.city_name}</span>
                      </div>
                      <p style="font-size: 1rem; color: #333;">Por favor, comunícate con el centro o acércate si puedes ayudar. ¡Tu donación puede salvar vidas!</p>
                      <div style="text-align:center; margin: 32px 0 0 0;">
                        <a href="mailto:${healthCenter.contact_phone ? healthCenter.contact_phone : ''}" style="background: #dc3545; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1.1rem; box-shadow: 0 2px 10px rgba(220,53,69,0.15);">Contactar Centro</a>
                      </div>
                    </div>
                    <div style="background: #f8d7da; color: #c82333; text-align: center; padding: 12px 0; font-size: 0.95rem; border-top: 1px solid #f1b0b7;">
                      SangreVital &copy; 2025 &mdash; Tu donación es vida
                    </div>
                  </div>
                </div>
            `
        };
        await transporter.sendMail(mailOptions);
        res.redirect('/health-center/dashboard?solicitudHecha=1');
    } catch (err) {
        console.error('Error enviando solicitud al donante:', err);
        res.redirect('/health-center/dashboard');
    }
};

// Utilidad para compatibilidad sanguínea (simplificada)
function getBloodCompatibilitySQL(field) {
    return `(
        (${field} = 'O-' AND $1 = 'O-') OR
        (${field} = 'O+' AND $1 IN ('O+', 'O-')) OR
        (${field} = 'A-' AND $1 IN ('A-', 'O-')) OR
        (${field} = 'A+' AND $1 IN ('A+', 'A-', 'O+', 'O-')) OR
        (${field} = 'B-' AND $1 IN ('B-', 'O-')) OR
        (${field} = 'B+' AND $1 IN ('B+', 'B-', 'O+', 'O-')) OR
        (${field} = 'AB-' AND $1 IN ('AB-', 'A-', 'B-', 'O-')) OR
        (${field} = 'AB+' AND $1 IN ('AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'))
    )`;
}
