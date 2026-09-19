/**
 * API Wrapper for backend
 */
const API = {
  baseUrl: '/api',

  ERROR_MESSAGES: {
    'All fields are required': 'جميع الحقول مطلوبة.',
    'Email already registered': 'هذا البريد الإلكتروني مسجّل مسبقاً.',
    'Invalid registration details': 'تحقق من الاسم وكلمة المرور (6 أحرف على الأقل).',
    'Email and password are required': 'البريد الإلكتروني وكلمة المرور مطلوبان.',
    'Invalid email or password': 'البريد الإلكتروني أو كلمة المرور غير صحيحة.',
    'Please login with Google for this account': 'هذا الحساب مرتبط بـ Google. يرجى تسجيل الدخول عبر Google.',
    'Unauthorized': 'انتهت الجلسة. يرجى تسجيل الدخول مجدداً.',
    'Forbidden': 'ليس لديك صلاحية للوصول.',
    'Missing credential': 'بيانات Google غير متوفرة.',
    'Invalid Google token': 'فشل التحقق من حساب Google.',
    'API Request Failed': 'حدث خطأ في الاتصال بالخادم.',
  },

  translateError(message) {
    return this.ERROR_MESSAGES[message] || message || 'حدث خطأ غير متوقع.';
  },

  getToken() {
    return localStorage.getItem('quinzy_token');
  },

  setToken(token) {
    localStorage.setItem('quinzy_token', token);
  },

  clearToken() {
    localStorage.removeItem('quinzy_token');
  },

  isAuthPage() {
    return document.body.classList.contains('auth-page');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if ((response.status === 401 || response.status === 403) && !this.isAuthPage()) {
        this.clearToken();
        window.Auth?.logout(true);
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'API Request Failed');
    }

    return response.json();
  },

  async loginWithGoogle(credential) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });
    this.setToken(data.token);
    return data.user;
  },

  async register(username, email, password) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
  },

  async login(email, password) {
    const data = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    this.setToken(data.token);
    return data.user;
  },

  async getMe() {
    return this.request('/me');
  },

  async updateProfile(data) {
    return this.request('/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },

  async getProgress() {
    return this.request('/progress');
  },

  async saveProgress(lessonId, score, totalQuestions, passed) {
    return this.request('/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId, score, totalQuestions, passed }),
    });
  },
};

window.API = API;
