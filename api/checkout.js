const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async (req, res) => {
    // Cabeceras CORS para permitir la conexión con Framer
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // Manejo de peticiones preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: "Método no permitido. Usa POST." });
    }

    try {
        const { items } = req.body;
        
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            
            // 1. Recolección de Dirección de Envío (Habilitado para México)
            shipping_address_collection: {
                allowed_countries: ['MX'],
            },
            
            // 2. Recolección de Número de Teléfono
            phone_number_collection: {
                enabled: true,
            },

            line_items: items.map(item => ({
                price_data: {
                    currency: 'mxn',
                    product_data: { name: item.name },
                    unit_amount: Math.round(item.price * 100),
                },
                quantity: item.quantity,
            })),
            mode: 'payment',
            success_url: `${req.headers.origin}/?success=true`,
            cancel_url: `${req.headers.origin}/?canceled=true`,
        });

        res.status(200).json({ url: session.url });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};
