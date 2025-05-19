require('dotenv').config();
const express = require('express');
const router = express.Router();
const axios = require('axios');

router.post('/chat', async (req, res) => {
    try {
        // 1. Validar entrada
        if (!req.body.message?.trim()) {
            return res.status(400).json({ 
                error: 'Por favor escribe tu mensaje' 
            });
        }

        // 2. Configurar mensajes con contexto de donación de sangre
        const messages = [
            {
                role: "system",
                content: "Eres 'Asistente SangreVital', un experto en donación de sangre. " +
                        "Proporciona información precisa y actualizada sobre: " +
                        "- Requisitos para donar (edad, peso, salud) " +
                        "- Frecuencia recomendada entre donaciones " +
                        "- Beneficios del proceso " +
                        "- Centros de donación autorizados " +
                        "Mantén respuestas en español, claras y menores a 50 palabras. " +
                        "Si la pregunta no está relacionada, redirige amablemente al tema."+
                        "Cuando respondas con iteraciones, hazlas haciendo un salto de linea y enumeradas."+
                        "cuando sea necesario excede las respuestas hasta 100 palabras."
            },
            ...(req.body.history || []),
            { 
                role: 'user', 
                content: req.body.message.trim() 
            }
        ];

        // 3. Llamar a Groq API
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama3-70b-8192', // Modelo actualizado
            messages: messages,
            temperature: 0.5, // Más determinista
            max_tokens: 300,
            response_format: { type: "text" }
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 15000 // 15 segundos
        });

        // 4. Procesar respuesta
        let botReply = response.data.choices[0].message.content;

        // Mejorar formato: saltos de línea para enumeraciones, listas y oraciones
        botReply = botReply
            // Salto de línea antes de enumeraciones tipo "1. ", "2. ", etc. (incluso si están pegadas al texto)
            .replace(/\s?(\d+\.\s)/g, '\n$1')
            // Salto de línea antes de viñetas tipo "- " o "• "
            .replace(/\s?([-•]\s)/g, '\n$1')
            // Salto de línea antes de palabras en negrita (doble asterisco)
            .replace(/\s?(\*\*\w)/g, '\n$1')
            // Salto de línea después de punto final, signo de exclamación o interrogación, seguido de espacio y cualquier carácter (excepto salto de línea)
            .replace(/([\.!?])\s+(?=\S)/g, '$1\n')
            // Eliminar saltos de línea dobles innecesarios
            .replace(/\n{2,}/g, '\n')
            // Quitar salto de línea inicial si existe
            .replace(/^\n+/, '');

        // 5. Filtrar respuestas no relacionadas
        const finalReply = botReply.includes("donación") || 
                          botReply.includes("sangre") || 
                          /requisitos|centro|beneficio/i.test(botReply)
            ? botReply
            : "¿Tienes alguna pregunta sobre donación de sangre? Puedo ayudarte con: " +
              "• Requisitos • Centros cercanos • Beneficios";

        // 6. Responder al cliente
        res.json({
            reply: finalReply,
            history: [
                ...messages,
                { 
                    role: 'assistant', 
                    content: finalReply 
                }
            ]
        });

    } catch (error) {
        console.error('Error en /api/chat:', {
            message: error.message,
            response: error.response?.data,
            stack: error.stack
        });

        // Manejo especial de errores conocidos
        if (error.response?.data?.error?.message.includes('model')) {
            return res.status(400).json({
                error: 'Error de configuración. Por favor contacta al soporte.'
            });
        }

        res.status(500).json({
            error: error.response?.data?.error?.message || 
                 'Estoy teniendo dificultades. ¿Podrías reformular tu pregunta sobre donación de sangre?'
        });
    }
});

module.exports = router;