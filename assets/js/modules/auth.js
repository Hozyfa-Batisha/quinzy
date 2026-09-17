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
      btnLogin.addEventListener('click', () => this.triggerGoogleLogin());
    }

    if (btnLogout) {
      btnLogout.addEventListener('click', () => this.logout());
    }

    if (btnProfile) {
      btnProfile.addEventListener('click', () => {
        // Show profile view
        document.getElementById('home-view')?.classList.add('hidden');
        document.getElementById('lesson-view')?.classList.add('hidden');
        document.getElementById('profile-view')?.classList.remove('hidden');
        window.Profile?.render();
      });
    }

    // Brand link returns home
    document.getElementById('brand-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('profile-view')?.classList.add('hidden');
      document.getElementById('lesson-view')?.classList.add('hidden');
      document.getElementById('home-view')?.classList.remove('hidden');
    });
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
      btnLogin.style.display = 'none';
      btnProfile.style.display = 'block';
      avatarImg.src = this.currentUser.picture || 'assets/images/default-avatar.png';
      
      // Update profile page header if it exists
      const pageAvatar = document.getElementById('profile-page-avatar');
      const pageName = document.getElementById('profile-page-name');
      const pageEmail = document.getElementById('profile-page-email');
      
      if (pageAvatar) pageAvatar.src = this.currentUser.picture;
      if (pageName) pageName.textContent = this.currentUser.name;
      if (pageEmail) pageEmail.textContent = this.currentUser.email;

    } else {
      btnLogin.style.display = 'block';
      btnProfile.style.display = 'none';
    }
  },

  triggerGoogleLogin() {
    // We expect the Google Identity Services client to be loaded in index.html
    // and initialized with the client ID. But since we need a dynamic client ID,
    // we'll tell the user to configure it via the <script> tag attributes or init.
    
    // Check if google is available
    if (typeof google === 'undefined' || !google.accounts) {
      alert('Google Auth is not loaded yet or Client ID is missing. Please check your configuration.');
      return;
    }

    // Since we want a popup, we can use the implicit flow or the new GIS tokenClient
    // Let's assume we initialize it here if not already done
    if (!this.googleClient) {
      // NOTE: GOOGLE_CLIENT_ID must be replaced by the actual ID in index.html
      const clientId = window.GOOGLE_CLIENT_ID;
      
      if (!clientId || clientId === 'YOUR_GOOGLE_CLIENT_ID') {
        alert('يرجى إضافة GOOGLE_CLIENT_ID الخاص بك في ملف index.html');
        return;
      }

      google.accounts.id.initialize({
        client_id: clientId,
        callback: this.handleCredentialResponse.bind(this)
      });
    }

    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
        // Fallback or explicit trigger if One Tap doesn't show
        google.accounts.id.prompt(); 
      }
    });
  },

  async handleCredentialResponse(response) {
    try {
      const user = await window.API.loginWithGoogle(response.credential);
      this.setCurrentUser(user);
    } catch (err) {
      alert('Login failed. Please try again.');
    }
  },

  logout() {
    window.API.clearToken();
    this.setCurrentUser(null);
    
    // Go back to home view
    document.getElementById('profile-view')?.classList.add('hidden');
    document.getElementById('lesson-view')?.classList.add('hidden');
    document.getElementById('home-view')?.classList.remove('hidden');
  }
};

window.Auth = Auth;
document.addEventListener('DOMContentLoaded', () => Auth.init());
