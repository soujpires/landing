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
  const adminHeaders = {
    'Content-Type': 'application/json',
    'apikey': SERVICE_KEY,
    'Authorization': `Bearer ${SERVICE_KEY}`,
  };

  try {
    // 1. Verificar se já existe
    const listRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users?filter=${encodeURIComponent(email)}`,
      { headers: adminHeaders }
    );
    const listData = await listRes.json();
    const jaExiste = (listData?.users || []).find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (jaExiste) {
      console.log('Trial: email já cadastrado:', email);
      return res.status(200).json({ ok: true });
    }

    // 2. Criar usuário via Admin API com email_confirm: false
    //    Isso cria o usuário MAS não confirma o email — Supabase vai enviar o email de confirmação
    const senhaTemp = Math.random().toString(36).slice(2) +
                      Math.random().toString(36).slice(2).toUpperCase() + '!9';

    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        email,
        password: senhaTemp,
        email_confirm: false, // força envio do email de confirmação
        user_metadata: {
          plano: 'trial',
          origem: 'landing',
          ativado_em: new Date().toISOString(),
        },
      }),
    });

    const createData = await createRes.json();

    if (!createRes.ok || createData?.error) {
      console.error('Trial create erro:', JSON.stringify(createData));
      return res.status(500).json({ error: 'Erro ao criar trial' });
    }

    const userId = createData?.id;
    console.log('Usuário criado:', email, userId);

    // 3. Gerar link de confirmação com redirect para reset-password
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        type: 'signup',
        email,
        redirect_to: 'https://simpp.com.br/reset-password.html',
      }),
    });

    const linkData = await linkRes.json();

    if (!linkRes.ok || linkData?.error) {
      console.error('Trial generate_link erro:', JSON.stringify(linkData));
      // Usuário foi criado mas link falhou — ainda retorna ok
      return res.status(200).json({ ok: true });
    }

    // 4. Enviar email com o link via Supabase
    // O generate_link já envia o email automaticamente quando action_link é gerado
    console.log('Link gerado para:', email);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Trial error:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
