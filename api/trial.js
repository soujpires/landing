const SUPABASE_URL = 'https://qqmfvpubrrdxakowpldv.supabase.co';

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).send('OK');
  }
  if (req.method !== 'POST') {
    return res.status(405).send('Method not allowed');
  }

  const { email, password, whatsapp, nome } = req.body || {};

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Email inválido' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Senha deve ter pelo menos 6 caracteres' });
  }

  const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

  try {
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          plano: 'trial',
          origem: 'landing',
          nome: nome || '',
          whatsapp: whatsapp || '',
          ativado_em: new Date().toISOString(),
        },
      }),
    });

    const createData = await createRes.json();

    if (!createRes.ok || createData?.error) {
      const msg = createData?.msg || createData?.error?.message || '';
      if (msg.toLowerCase().includes('already') || createData?.code === 'email_exists') {
        return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
      }
      console.error('Trial create erro:', JSON.stringify(createData));
      return res.status(500).json({ error: 'Erro ao criar conta' });
    }

    console.log('Trial criado:', email, createData?.id, 'whatsapp:', whatsapp);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Trial error:', err.message);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
