/**
 * API Wrapper for local backend
 */
const API = {
  baseUrl: '/api',

  getToken() {
    return localStorage.getItem('quinzy_token');
  },

  setToken(token) {
    localStorage.setItem('quinzy_token', token);
  },

  clearToken() {
    localStorage.removeItem('quinzy_token');
  },

  async request(endpoint, options = {}) {
    const token = this.getToken();
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token expired or invalid
          this.clearToken();
          window.Auth?.logout();
          throw new Error('Unauthorized');
        }
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'API Request Failed');
      }

      return await response.json();
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  async loginWithGoogle(credential) {
    const data = await this.request('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential })
    });
    this.setToken(data.token);
    return data.user;
  },

  async getMe() {
    return this.request('/me');
  },

  async getProgress() {
    return this.request('/progress');
  },

  async saveProgress(lessonId, score, totalQuestions, passed) {
    return this.request('/progress', {
      method: 'POST',
      body: JSON.stringify({ lessonId, score, totalQuestions, passed })
    });
  }
};

window.API = API;
