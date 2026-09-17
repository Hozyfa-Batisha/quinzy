/**
 * Authentication Module
 */
const Auth = {
  currentUser: null,

  async init() {
    this.bindEvents();
    
    // Check if we have a token and try to load the user
    if (window.API.getToken()) {
      try {
        const user = await window.API.getMe();
        this.setCurrentUser(user);
        if (window.Profile && document.getElementById('profile-stats-grid')) {
          window.Profile.render();
        }
      } catch (err) {
        // Token invalid or expired
        this.setCurrentUser(null);
      }
    } else {
      this.setCurrentUser(null);
    }
  },

  bindEvents() {
    const btnLogin = document.getElementById('btn-login');
    const btnLogout = document.getElementById('btn-logout');
    const btnProfile = document.getElementById('btn-profile');

    if (btnLogin) {
      btnLogin.addEventListener('click', () => {
        window.location.href = '/login.html';
      });
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.logout());
    }

    if (btnProfile) {
      btnProfile.addEventListener('click', () => {
        window.location.href = '/profile.html';
      });
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
      if (btnProfile) btnProfile.style.display = 'block';
      if (avatarImg) avatarImg.src = this.currentUser.picture || '/assets/images/default-avatar.png';
      
      // Update profile page header if it exists
      const pageAvatar = document.getElementById('profile-page-avatar');
      const pageName = document.getElementById('profile-page-name');
      const pageEmail = document.getElementById('profile-page-email');
      
      if (pageAvatar) pageAvatar.src = this.currentUser.picture;
      if (pageName) pageName.textContent = this.currentUser.name;
      if (pageEmail) pageEmail.textContent = this.currentUser.email;

    } else {
      if (btnLogin) btnLogin.style.display = 'block';
      if (btnProfile) btnProfile.style.display = 'none';
    }
  },

  async handleCredentialResponse(response) {
    try {
      const user = await window.API.loginWithGoogle(response.credential);
      this.setCurrentUser(user);
      // Redirect to profile page after login
      window.location.href = '/profile.html';
    } catch (err) {
      alert('فشل تسجيل الدخول، يرجى المحاولة مرة أخرى.');
    }
  },

  logout() {
    window.API.clearToken();
    this.setCurrentUser(null);
    window.location.href = '/';
  }
};

window.Auth = Auth;

// Global callback for the Google Sign-In HTML API used in login.html
window.handleCredentialResponse = (response) => {
  Auth.handleCredentialResponse(response);
};

document.addEventListener('DOMContentLoaded', () => Auth.init());
