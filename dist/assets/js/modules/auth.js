/**
 * Authentication Module
 */
const Auth = {
  currentUser: null,
  DEFAULT_AVATAR: '/assets/images/default-avatar.svg',

  async init() {
    this.bindEvents();
    await this.restoreSession();
    this.guardAuthPages();
  },

  async restoreSession() {
    if (!window.API.getToken()) {
      this.setCurrentUser(null);
      return;
    }

    try {
      const user = await window.API.getMe();
      this.setCurrentUser(user);
      if (window.Profile && document.getElementById('profile-stats-grid')) {
        window.Profile.render();
      }
    } catch {
      window.API.clearToken();
      this.setCurrentUser(null);
    }
  },

  guardAuthPages() {
    const isAuthPage = document.body.classList.contains('auth-page');
    if (isAuthPage && this.currentUser) {
      window.location.href = '/profile.html';
    }
  },

  bindEvents() {
    document.getElementById('nav-how-it-works')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('btn-logout')?.addEventListener('click', () => this.logout());

    document.getElementById('btn-login')?.addEventListener('click', () => {
      window.location.href = '/login.html';
    });
    document.getElementById('btn-profile')?.addEventListener('click', () => {
      window.location.href = '/profile.html';
    });

    document.getElementById('login-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleLogin();
    });

    document.getElementById('register-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegister();
    });

    document.querySelectorAll('[data-password-toggle]').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const input = document.getElementById(toggle.dataset.passwordToggle);
        if (!input) return;
        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        toggle.setAttribute('aria-label', isPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور');
        toggle.textContent = isPassword ? 'إخفاء' : 'إظهار';
      });
    });

    if (!window.GOOGLE_CLIENT_ID || window.GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID') {
      document.querySelectorAll('.auth-google, .auth-divider').forEach((element) => element.remove());
    }
  },

  setLoading(buttonId, loading) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;
    btn.classList.toggle('loading', loading);
    btn.disabled = loading;
  },

  showAlert(message, type = 'error') {
    const alert = document.getElementById('auth-alert');
    if (alert) {
      alert.textContent = message;
      alert.className = `auth-alert show ${type}`;
      return;
    }
    this.showToast(message, type);
  },

  clearAlert() {
    const alert = document.getElementById('auth-alert');
    if (alert) {
      alert.textContent = '';
      alert.className = 'auth-alert';
    }
  },

  showToast(message, type = 'error') {
    const container = document.getElementById('auth-toast-container');
    if (!container) {
      alert(message);
      return;
    }

    const toast = document.createElement('div');
    toast.className = `auth-toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  },

  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  markInvalid(inputId, invalid) {
    const input = document.getElementById(inputId);
    if (input) {
      input.classList.toggle('invalid', invalid);
      input.setAttribute('aria-invalid', String(invalid));
    }
  },

  async handleLogin() {
    this.clearAlert();

    const email = document.getElementById('login-email')?.value.trim();
    const password = document.getElementById('login-password')?.value;

    this.markInvalid('login-email', false);
    this.markInvalid('login-password', false);

    if (!email || !this.validateEmail(email)) {
      this.markInvalid('login-email', true);
      this.showAlert('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }

    if (!password || password.length < 6) {
      this.markInvalid('login-password', true);
      this.showAlert('يرجى إدخال كلمة مرور صحيحة (6 أحرف على الأقل).');
      return;
    }

    this.setLoading('login-submit', true);

    try {
      const user = await window.API.login(email, password);
      this.setCurrentUser(user);
      this.showToast('تم تسجيل الدخول بنجاح', 'success');
      setTimeout(() => { window.location.href = '/profile.html'; }, 400);
    } catch (err) {
      this.showAlert(window.API.translateError(err.message));
    } finally {
      this.setLoading('login-submit', false);
    }
  },

  async handleRegister() {
    this.clearAlert();

    const name = document.getElementById('register-name')?.value.trim();
    const email = document.getElementById('register-email')?.value.trim();
    const password = document.getElementById('register-password')?.value;
    const confirm = document.getElementById('register-password-confirm')?.value;

    ['register-name', 'register-email', 'register-password', 'register-password-confirm'].forEach((id) => {
      this.markInvalid(id, false);
    });

    if (!name || name.length < 2) {
      this.markInvalid('register-name', true);
      this.showAlert('يرجى إدخال اسم صحيح (حرفان على الأقل).');
      return;
    }

    if (!email || !this.validateEmail(email)) {
      this.markInvalid('register-email', true);
      this.showAlert('يرجى إدخال بريد إلكتروني صحيح.');
      return;
    }

    if (!password || password.length < 6) {
      this.markInvalid('register-password', true);
      this.showAlert('كلمة المرور يجب أن تكون 6 أحرف على الأقل.');
      return;
    }

    if (password !== confirm) {
      this.markInvalid('register-password-confirm', true);
      this.showAlert('كلمتا المرور غير متطابقتين.');
      return;
    }

    this.setLoading('register-submit', true);

    try {
      await window.API.register(name, email, password);
      const user = await window.API.login(email, password);
      this.setCurrentUser(user);
      this.showAlert('تم إنشاء حسابك بنجاح! جاري تحويلك...', 'success');
      setTimeout(() => { window.location.href = '/profile.html'; }, 800);
    } catch (err) {
      this.showAlert(window.API.translateError(err.message));
    } finally {
      this.setLoading('register-submit', false);
    }
  },

  setCurrentUser(user) {
    this.currentUser = user;
    this.updateUI();
  },

  updateUI() {
    const btnLogin = document.getElementById('btn-login');
    const btnProfile = document.getElementById('btn-profile');
    const avatarImg = document.getElementById('profile-avatar');

    if (this.currentUser) {
      if (btnLogin) btnLogin.style.display = 'none';
      if (btnProfile) btnProfile.style.display = 'flex';
      if (avatarImg) {
        avatarImg.src = this.currentUser.picture || this.DEFAULT_AVATAR;
        avatarImg.onerror = () => { avatarImg.src = this.DEFAULT_AVATAR; };
      }

      const pageAvatar = document.getElementById('profile-page-avatar');
      const pageName = document.getElementById('profile-page-name');
      const pageEmail = document.getElementById('profile-page-email');

      if (pageAvatar) {
        pageAvatar.src = this.currentUser.picture || this.DEFAULT_AVATAR;
        pageAvatar.onerror = () => { pageAvatar.src = this.DEFAULT_AVATAR; };
      }
      if (pageName) pageName.textContent = this.currentUser.name || 'مستخدم';
      if (pageEmail) pageEmail.textContent = this.currentUser.email || '';
    } else {
      if (btnLogin) btnLogin.style.display = 'inline-flex';
      if (btnProfile) btnProfile.style.display = 'none';
    }
  },

  async handleCredentialResponse(response) {
    this.setLoading('login-submit', true);
    this.setLoading('register-submit', true);

    try {
      const user = await window.API.loginWithGoogle(response.credential);
      this.setCurrentUser(user);
      this.showToast('تم تسجيل الدخول بنجاح', 'success');
      setTimeout(() => { window.location.href = '/profile.html'; }, 400);
    } catch {
      this.showAlert('فشل تسجيل الدخول عبر Google. يرجى المحاولة مرة أخرى.');
    } finally {
      this.setLoading('login-submit', false);
      this.setLoading('register-submit', false);
    }
  },

  logout(redirect = true) {
    window.API.clearToken();
    this.setCurrentUser(null);
    if (redirect) window.location.href = '/';
  },
};

window.Auth = Auth;

window.handleCredentialResponse = (response) => {
  Auth.handleCredentialResponse(response);
};

document.addEventListener('DOMContentLoaded', () => Auth.init());
