const SUPABASE_URL = 'https://qqmfvpubrrdxakowpldv.supabase.co';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).send('OK');
  }

  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const body = req.body || {};

  console.log('Kiwify webhook recebido:', JSON.stringify(body));

  // Kiwify envia order_status = 'paid' para pagamento aprovado
  const status = body.order_status;
  const email = body.Customer?.email;

  if (status !== 'paid') {
    console.log(`Status ${status} — ignorado`);
    return res.status(200).send('OK');
  }

  if (!email) {
    console.error('Email não encontrado no webhook');
    return res.status(200).send('OK');
  }

  console.log(`Pagamento aprovado para: ${email}`);

  try {
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
          origem: 'kiwify',
          order_id: body.order_id || '',
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
