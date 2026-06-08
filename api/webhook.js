export const config = { runtime: 'edge' };

const SUPABASE_URL = 'https://qqmfvpubrrdxakowpldv.supabase.co';

export default async function handler(req) {
  // MP envia GET com ?topic=payment&id=xxx para validar a URL
  if (req.method === 'GET') {
    return new Response('OK', { status: 200 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body = {};
  try { body = await req.json(); } catch (_) {}

  const { type, data } = body;

  // Só processa notificações de pagamento
  if (type !== 'payment' || !data?.id) {
    return new Response('OK', { status: 200 });
  }

  try {
    // Busca detalhes do pagamento no MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${data.id}`, {
      headers: {
        Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      },
    });

    const payment = await mpRes.json();

    // Só processa pagamentos aprovados
    if (payment.status !== 'approved') {
      console.log(`Pagamento ${data.id} status: ${payment.status} — ignorado`);
      return new Response('OK', { status: 200 });
    }

    const email = payment.payer?.email;

    if (!email) {
      console.error('Email não encontrado no pagamento:', data.id);
      return new Response('OK', { status: 200 });
    }

    console.log(`Pagamento aprovado para: ${email} — criando usuário no Supabase`);

    // Convida o usuário no Supabase (dispara e-mail de acesso)
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

    if (!supaRes.ok) {
      // Se o usuário já existe, apenas loga — não é erro crítico
      if (supaData?.msg?.includes('already been registered')) {
        console.log(`Usuário ${email} já existe no Supabase`);
      } else {
        console.error('Supabase invite error:', supaData);
      }
    } else {
      console.log(`Invite enviado com sucesso para: ${email}`);
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('Webhook error:', err);
    // Retorna 200 mesmo em erro para o MP não reenviar infinitamente
    return new Response('OK', { status: 200 });
  }
}
