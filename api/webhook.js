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

  const status = body.order_status;
  const email  = body.Customer?.email;

  if (status !== 'paid') {
    console.log(`Status ${status} — ignorado`);
    return res.status(200).send('OK');
  }
  if (!email) {
    console.error('Email não encontrado no webhook');
    return res.status(200).send('OK');
  }

  console.log(`Pagamento aprovado para: ${email}`);

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  };

  try {
    // 1. Verificar se o usuário já existe (veio pelo trial)
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
      { headers }
    );
    const listData = await listRes.json();
    const usuarioExistente = listData?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (usuarioExistente) {
      // Usuário já existe (trial) — só atualiza is_paid = true
      console.log('Usuário existente, atualizando is_paid:', usuarioExistente.id);

      const updateRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${usuarioExistente.id}`,
        {
          method: 'PATCH',
          headers: { ...headers, 'Prefer': 'return=minimal' },
          body: JSON.stringify({ is_paid: true }),
        }
      );
      console.log('is_paid atualizado, status:', updateRes.status);

    } else {
      // Usuário novo (comprou sem trial) — enviar invite com redirect para reset-password
      console.log('Usuário novo, enviando invite:', email);

      const inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          email,
          options: {
            redirect_to: 'https://simpp.com.br/reset-password.html',
          },
          data: {
            plano: 'anual',
            origem: 'kiwify',
            order_id: body.order_id || '',
            ativado_em: new Date().toISOString(),
            expira_em: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
          },
        }),
      });

      const inviteData = await inviteRes.json();
      console.log('Supabase invite:', JSON.stringify(inviteData));
    }

    return res.status(200).send('OK');

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(200).send('OK');
  }
}
