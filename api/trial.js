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
  const ANON_KEY    = process.env.SUPABASE_ANON_KEY;
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
    const jaExiste = (listData?.users || []).find(
      u => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (jaExiste) {
      // Não revelar que o email já existe — retorna sucesso silencioso
      console.log('Trial: email já cadastrado:', email);
      return res.status(200).json({ ok: true });
    }

    // Gerar senha temporária aleatória (o usuário vai redefinir pelo link)
    const senhaTemp = Math.random().toString(36).slice(2) +
                      Math.random().toString(36).slice(2).toUpperCase() +
                      '!9';

    // Criar conta via signUp — dispara email de confirmação
    const signUpRes = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY || SERVICE_KEY,
        'Authorization': `Bearer ${ANON_KEY || SERVICE_KEY}`,
      },
      body: JSON.stringify({
        email,
        password: senhaTemp,
        options: {
          emailRedirectTo: 'https://simpp.com.br/reset-password.html',
          data: {
            plano: 'trial',
            origem: 'landing',
            ativado_em: new Date().toISOString(),
          },
        },
      }),
    });

    const signUpData = await signUpRes.json();

    if (!signUpRes.ok || signUpData?.error) {
      console.error('Trial signUp erro:', JSON.stringify(signUpData));
      return res.status(500).json({ error: 'Erro ao criar trial' });
    }

    console.log('Trial criado para:', email, '| id:', signUpData?.id);
    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error('Trial error:', err);
    return res.status(500).json({ error: 'Erro interno' });
  }
}
