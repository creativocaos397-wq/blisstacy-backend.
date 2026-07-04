const Stripe = require('stripe');

// Inicializamos Stripe utilizando la variable de entorno que configuraste en Vercel
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    // 1. Configuración de CORS para permitir que Framer se comunique con este servidor
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Manejo de la petición preflight (OPTIONS) que hacen los navegadores por seguridad
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Bloqueamos cualquier petición que no sea POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
    }

    try {
        // Extraemos los productos enviados desde tu carrito en Framer
        const { items } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({ error: 'El carrito está vacío.' });
        }

        // 2. Mapeamos los datos al formato exacto que exige Stripe (line_items)
        const line_items = items.map((item) => ({
            price_data: {
                currency: 'mxn',
                product_data: {
                    name: item.name,
                    images: item.image ? [item.image] : [],
                },
                // Stripe maneja los montos en centavos. Multiplicamos por 100 y redondeamos.
                unit_amount: Math.round(item.price * 100), 
            },
            quantity: item.quantity,
        }));

        // 3. Creamos la sesión segura de Checkout
        const session = await stripe.checkout.sessions.create({
            line_items,
            mode: 'payment',
            
            // Habilitamos tarjetas y SPEI nativo configurado en tu panel
            automatic_payment_methods: { 
                enabled: true 
            },
            
            // Obligamos al cliente a ingresar sus datos de entrega en México
            shipping_address_collection: {
                allowed_countries: ['MX'], 
            },
            
            // Solicitamos número de teléfono para la paquetería
            phone_number_collection: {
                enabled: true,
            },

            // URLs de redirección (puedes cambiarlas por los links reales de tu sitio después)
            success_url: req.headers.origin ? `${req.headers.origin}?pago=exitoso` : 'https://tu-sitio-framer.com/?pago=exitoso',
            cancel_url: req.headers.origin ? `${req.headers.origin}?pago=cancelado` : 'https://tu-sitio-framer.com/',
        });

        // 4. Devolvemos la URL segura al frontend para hacer la redirección
        return res.status(200).json({ url: session.url });

    } catch (error) {
        console.error('Error al generar la sesión de Stripe:', error);
        return res.status(500).json({ error: 'Error interno al procesar el pago.' });
    }
};