const SUPABASE_URL = 'https://qqmfvpubrrdxakowpldv.supabase.co';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).send('OK');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const { type, data } = req.body || {};

  if (type !== 'payment' || !data?.id) {
    return res.status(200).send('OK');
  }

  try {
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });

    const payment = await mpRes.json();

    if (payment.status !== 'approved') {
      console.log(`Pagamento ${data.id} status: ${payment.status} — ignorado`);
      return res.status(200).send('OK');
    }

    const email = payment.payer?.email;
    if (!email) {
      console.error('Email não encontrado no pagamento:', data.id);
      return res.status(200).send('OK');
    }

    console.log(`Pagamento aprovado para: ${email}`);

    const supaRes = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: process.env.SUPABASE_SERVICE_KEY,
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email,
        data: {
          plano: 'anual',
          origem: 'mercadopago',
          payment_id: String(data.id),
          ativado_em: new Date().toISOString(),
          expira_em: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        },
      }),
    });

    const supaData = await supaRes.json();
    console.log('Supabase invite:', JSON.stringify(supaData));

    return res.status(200).send('OK');
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).send('OK');
  }
}
