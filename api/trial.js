const SUPABASE_URL = 'https://qqmfvpubrrdxakowpldv.supabase.co';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).send('OK');
  }
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const { email } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  };

  try {
    // Verificar se o email já está cadastrado
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
      { headers }
    );
    const listData = await listRes.json();
    const jaExiste = listData?.users?.find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (jaExiste) {
      console.log('Trial: email já cadastrado:', email);
      // Retorna sucesso mesmo assim — não revelar que o email existe
      return res.status(200).json({ ok: true });
    }

    // Enviar invite com redirect para reset-password (definir senha)
    const inviteRes = await fetch(`${SUPABASE_URL}/auth/v1/invite`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        options: {
          redirect_to: 'https://simpp.com.br/reset-password.html',
        },
        data: {
          plano: 'trial',
          origem: 'landing',
          ativado_em: new Date().toISOString(),
        },
      }),
    });

    const inviteData = await inviteRes.json();

    if (!inviteRes.ok) {
      console.error('Trial invite erro:', JSON.stringify(inviteData));
      return res.status(500).json({ error: 'Erro ao criar trial' });
    }

    console.log('Trial criado para:', email);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Trial error:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
