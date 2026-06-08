export const config = { runtime: 'edge' };

export default async function handler(req) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  let body = {};
  try { body = await req.json(); } catch (_) {}

  const email = body.email || '';

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
    payer: email ? { email } : undefined,
    payment_methods: {
      installments: 3,
      excluded_payment_types: [],
    },
    back_urls: {
      success: 'https://assine.simpp.com.br/obrigado',
      failure: 'https://assine.simpp.com.br/?erro=pagamento',
      pending: 'https://assine.simpp.com.br/obrigado',
    },
    auto_return: 'approved',
    notification_url: 'https://assine.simpp.com.br/api/webhook',
    statement_descriptor: 'SIMPP',
    expires: false,
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

    if (!mpRes.ok) {
      console.error('MP error:', data);
      return new Response(JSON.stringify({ error: 'Erro ao criar preferência', detail: data }), { status: 500 });
    }

    // Retorna a URL do checkout pro
    return new Response(JSON.stringify({ url: data.init_point }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(JSON.stringify({ error: 'Erro interno' }), { status: 500 });
  }
}
