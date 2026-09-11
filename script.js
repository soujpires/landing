const header = document.getElementById('header');
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
const modal = document.getElementById('trialModal');
const modalForm = document.getElementById('modalForm');
const modalSuccess = document.getElementById('modalSuccess');
const firstInput = document.getElementById('inputNome');
const promotionPopup = document.getElementById('promotionPopup');

window.addEventListener('scroll', () => header.classList.toggle('scrolled', scrollY > 20), { passive: true });

menuToggle.addEventListener('click', () => {
  const open = mainNav.classList.toggle('open');
  menuToggle.setAttribute('aria-expanded', String(open));
  menuToggle.innerHTML = `<i class="ti ti-${open ? 'x' : 'menu-2'}"></i>`;
});

mainNav.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  mainNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.innerHTML = '<i class="ti ti-menu-2"></i>';
}));

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

function openModal() {
  closePromotion(false);
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => firstInput.focus(), 250);
}

function closeModal() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-open-trial]').forEach((button) => button.addEventListener('click', openModal));
document.querySelector('[data-close-modal]').addEventListener('click', closeModal);
modal.addEventListener('click', (event) => { if (event.target === modal) closeModal(); });
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

function closePromotion(persist = true) {
  if (!promotionPopup) return;
  promotionPopup.classList.remove('visible');
  promotionPopup.setAttribute('aria-hidden', 'true');
  if (persist) {
    try { sessionStorage.setItem('simpp-promotion-dismissed', 'true'); } catch (error) { /* armazenamento indisponível */ }
  }
}

if (promotionPopup) {
  let dismissed = false;
  try { dismissed = sessionStorage.getItem('simpp-promotion-dismissed') === 'true'; } catch (error) { /* armazenamento indisponível */ }
  if (!dismissed) {
    setTimeout(() => {
      promotionPopup.classList.add('visible');
      promotionPopup.setAttribute('aria-hidden', 'false');
    }, 1400);
  }
  document.querySelector('[data-close-promotion]').addEventListener('click', () => closePromotion(true));
  document.querySelector('[data-promotion-trial]').addEventListener('click', () => {
    closePromotion(true);
    openModal();
  });
}

document.querySelectorAll('[data-checkout]').forEach((link) => {
  link.addEventListener('click', () => {
    if (typeof window.fbq !== 'undefined') {
      window.fbq('track', 'InitiateCheckout', { currency: 'BRL', value: 297, content_name: 'Simpp Anual' });
    }
  });
});

document.querySelectorAll('.faq-list details').forEach((detail) => {
  detail.addEventListener('toggle', () => {
    if (!detail.open) return;
    document.querySelectorAll('.faq-list details').forEach((other) => {
      if (other !== detail) other.removeAttribute('open');
    });
  });
});

let sb;
if (window.supabase) {
  const { createClient } = window.supabase;
  sb = createClient(
    'https://qqmfvpubrrdxakowpldv.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFxbWZ2cHVicnJkeGFrb3dwbGR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA3NTczMjEsImV4cCI6MjA5NjMzMzMyMX0.XLh29w5Jsq-u27hYfiy_7dOMzm9Ifs9_glvWOoQP6G0'
  );
}

function showError(message) {
  document.getElementById('formErro').textContent = message;
}

async function sendWelcome(userData) {
  try {
    await fetch('https://qoptwkmnyrjatcamrfxd.supabase.co/functions/v1/pipeline-webhook/cd802cba469deea8123985ae35be0ad86867baa37ce1286b', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'novo_cadastro',
        email: userData.email || '',
        nome: userData.nome || '',
        whatsapp: userData.whatsapp || '',
        created_at: new Date().toISOString()
      })
    });
  } catch (error) {
    console.warn('Não foi possível enviar a mensagem de boas-vindas.', error);
  }
}

modalForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const nome = document.getElementById('inputNome').value.trim();
  const email = document.getElementById('inputEmail').value.trim();
  const whatsapp = document.getElementById('inputWhatsapp').value.trim();
  const whatsappDigits = whatsapp.replace(/\D/g, '');
  const senha = document.getElementById('inputSenha').value;
  const button = document.getElementById('btnSubmit');
  const buttonText = document.getElementById('btnTxt');
  showError('');

  if (!nome) return showError('Informe seu nome.');
  if (!email || !email.includes('@')) return showError('Informe um e-mail válido.');
  if (whatsappDigits.length < 10 || whatsappDigits.length > 11) return showError('Informe um WhatsApp válido, com DDD.');
  if (senha.length < 6) return showError('A senha precisa ter pelo menos 6 caracteres.');
  if (!sb) return showError('Não foi possível conectar. Atualize a página e tente novamente.');

  button.disabled = true;
  buttonText.textContent = 'Criando sua conta...';

  const { error } = await sb.auth.signUp({
    email,
    password: senha,
    options: {
      emailRedirectTo: 'https://crm.simpp.com.br/login.html',
      data: { full_name: nome, whatsapp }
    }
  });

  if (error) {
    button.disabled = false;
    buttonText.textContent = 'Criar conta e testar grátis';
    showError(error.message.includes('already registered') ? 'Este e-mail já está cadastrado. Acesse o Simpp para entrar.' : 'Não foi possível criar sua conta. Tente novamente.');
    return;
  }

  await sb.auth.signOut();
  await sendWelcome({ email, nome, whatsapp });

  if (typeof window.fbq !== 'undefined') {
    window.fbq('track', 'Lead');
    window.fbq('track', 'StartTrial', { currency: 'BRL', value: 0, content_name: 'Trial Simpp' });
  }

  document.getElementById('emailConfirm').textContent = email;
  modalForm.style.display = 'none';
  modalSuccess.style.display = 'block';
});
