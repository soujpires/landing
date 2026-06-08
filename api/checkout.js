export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const preference = {
    items: [
      {
        id: 'simpp-anual',
        title: 'Simpp — Gestão de Carteira Anual',
        description: 'Acesso anual ao Simpp com importação IA, alertas de renovação e carteira organizada.',
        quantity: 1,
        currency_id: 'BRL',
        unit_price: 197.00,
      },
    ],
    payment_methods: {
      installments: 3,
    },
    back_urls: {
      success: 'https://assine.simpp.com.br/obrigado',
      failure: 'https://assine.simpp.com.br/?erro=pagamento',
      pending: 'https://assine.simpp.com.br/obrigado',
    },
    auto_return: 'approved',
    notification_url: 'https://assine.simpp.com.br/api/webhook',
    statement_descriptor: 'SIMPP',
  };

  try {
    const mpRes = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(preference),
    });

    const data = await mpRes.json();

    console.log('MP response status:', mpRes.status);
    console.log('MP response body:', JSON.stringify(data));

    if (!mpRes.ok) {
      return res.status(500).json({ error: 'Erro ao criar preferência', detail: data });
    }

    return res.status(200).json({ url: data.init_point });
  } catch (err) {
    console.error('Checkout error:', err);
    return res.status(500).json({ error: 'Erro interno', detail: err.message });
  }
}
