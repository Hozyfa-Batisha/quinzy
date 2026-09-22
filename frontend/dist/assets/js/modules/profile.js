/**
 * Profile Module — handles edit mode, avatar upload, and stats rendering
 */
const Profile = {
  _pendingAvatar: null, // base64 of a newly-selected photo, or null

  // ── Init ──────────────────────────────────────────────────────────────
  init() {
    this._bindEditButtons();
    this._bindAvatarUpload();
    this._bindForm();
  },

  // Called by Auth after user is loaded; populates the page and loads stats
  async onUserLoaded() {
    this._renderIdentity();
    await this._loadStats();
  },

  // ── Identity rendering ─────────────────────────────────────────────────
  _renderIdentity() {
    const user = window.Auth?.currentUser;
    if (!user) return;

    const avatarEl   = document.getElementById('profile-page-avatar');
    const nameEl     = document.getElementById('profile-page-name');
    const usernameEl = document.getElementById('profile-page-username');
    const emailEl    = document.getElementById('profile-page-email');

    if (avatarEl) {
      avatarEl.src = user.picture || window.Auth.DEFAULT_AVATAR;
      avatarEl.onerror = () => { avatarEl.src = window.Auth.DEFAULT_AVATAR; };
    }
    if (nameEl)     nameEl.textContent     = user.name || user.username || 'مستخدم';
    if (usernameEl) usernameEl.textContent = `@${user.username || 'user'}`;
    if (emailEl)    emailEl.textContent    = user.email || '';
  },

  // ── Edit mode ─────────────────────────────────────────────────────────
  _openEdit() {
    const user = window.Auth?.currentUser;
    if (!user) return;

    // Pre-fill form
    const nameInput     = document.getElementById('edit-name');
    const usernameInput = document.getElementById('edit-username');
    const emailInput    = document.getElementById('edit-email');

    if (nameInput)     nameInput.value     = user.name || user.username || '';
    if (usernameInput) usernameInput.value = user.username || '';
    if (emailInput)    emailInput.value    = user.email || '';

    // Show edit card, enable avatar zone
    document.getElementById('edit-form-card')?.classList.add('open');
    document.getElementById('avatar-zone')?.classList.add('edit-mode');

    // Scroll to form
    document.getElementById('edit-form-card')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  _closeEdit() {
    document.getElementById('edit-form-card')?.classList.remove('open');
    document.getElementById('avatar-zone')?.classList.remove('edit-mode');
    this._clearAlert();

    // Revert avatar preview if user cancelled
    const user = window.Auth?.currentUser;
    const avatarEl = document.getElementById('profile-page-avatar');
    if (avatarEl && user) {
      avatarEl.src = user.picture || window.Auth.DEFAULT_AVATAR;
    }
    this._pendingAvatar = null;
  },

  _bindEditButtons() {
    document.getElementById('btn-edit-profile')?.addEventListener('click', () => this._openEdit());
    document.getElementById('btn-cancel-edit')?.addEventListener('click', () => this._closeEdit());
  },

  // ── Avatar upload ─────────────────────────────────────────────────────
  _bindAvatarUpload() {
    const fileInput = document.getElementById('avatar-file-input');
    const avatarEl  = document.getElementById('profile-page-avatar');

    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = new Image();
        img.onload = () => {
          // Resize to max 200×200 via canvas
          const MAX = 200;
          let w = img.width, h = img.height;
          if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
          else       { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }

          const canvas = document.createElement('canvas');
          canvas.width  = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);

          const b64 = canvas.toDataURL('image/jpeg', 0.85);
          this._pendingAvatar = b64;
          if (avatarEl) avatarEl.src = b64;
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);

      // Reset so the same file can be re-selected
      fileInput.value = '';
    });
  },

  // ── Form submission ───────────────────────────────────────────────────
  _bindForm() {
    document.getElementById('profile-edit-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this._saveProfile();
    });
  },

  async _saveProfile() {
    const nameInput  = document.getElementById('edit-name');
    const emailInput = document.getElementById('edit-email');
    const saveBtn    = document.getElementById('btn-save-profile');
    const spinner    = document.getElementById('save-spinner');

    const name  = nameInput?.value.trim();
    const email = emailInput?.value.trim();

    // Basic validation
    if (!name || name.length < 2) {
      this._showAlert('يرجى إدخال اسم صحيح (حرفان على الأقل).', 'error');
      nameInput?.focus();
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      this._showAlert('يرجى إدخال بريد إلكتروني صحيح.', 'error');
      emailInput?.focus();
      return;
    }

    // Disable UI
    if (saveBtn)  { saveBtn.disabled = true; }
    if (spinner)  { spinner.style.display = 'inline-block'; }

    try {
      const picture = this._pendingAvatar || window.Auth?.currentUser?.picture;
      const result  = await window.API.updateProfile({ name, email, picture });

      // Update auth state
      if (window.Auth && result?.user) {
        window.Auth.setCurrentUser(result.user);
      }

      this._renderIdentity();
      this._pendingAvatar = null;
      this._closeEdit();
      this._showAlert('تم تحديث الملف الشخصي بنجاح ✓', 'success');
    } catch (err) {
      const msg = window.API?.translateError(err.message) || 'حدث خطأ. يرجى المحاولة مرة أخرى.';
      this._showAlert(msg, 'error');
    } finally {
      if (saveBtn)  { saveBtn.disabled = false; }
      if (spinner)  { spinner.style.display = 'none'; }
    }
  },

  // ── Alert helpers ─────────────────────────────────────────────────────
  _showAlert(msg, type = 'error') {
    const el = document.getElementById('profile-alert');
    if (!el) return;
    el.textContent = msg;
    el.className   = `profile-alert show ${type}`;
    if (type === 'success') {
      setTimeout(() => this._clearAlert(), 4000);
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  },

  _clearAlert() {
    const el = document.getElementById('profile-alert');
    if (el) { el.textContent = ''; el.className = 'profile-alert'; }
  },

  // ── Stats ─────────────────────────────────────────────────────────────
  async _loadStats() {
    const grid = document.getElementById('profile-stats-grid');
    if (!grid) return;

    grid.innerHTML = '<div class="stats-loading">جاري تحميل البيانات…</div>';

    try {
      const list = await window.API.getProgress();

      if (!list || list.length === 0) {
        grid.innerHTML = `
          <div class="stats-empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none"
                 stroke="currentColor" stroke-width="1.5">
              <circle cx="12" cy="12" r="10"/>
              <path d="M8 15s1.5-2 4-2 4 2 4 2"/>
              <line x1="9" y1="9" x2="9.01" y2="9"/>
              <line x1="15" y1="9" x2="15.01" y2="9"/>
            </svg>
            لم تُجرِ أي اختبارات بعد — ابدأ رحلتك الآن!
          </div>`;
        return;
      }

      grid.innerHTML = list.map(item => {
        const lesson  = window.LESSON_DATA?.find(l => l.id === item.lesson_id);
        const title   = lesson ? lesson.titleAr : item.lesson_id;
        const pct     = item.total_questions > 0
          ? Math.round((item.score / item.total_questions) * 100)
          : 0;
        const passed  = item.passed;
        const date    = new Date(item.created_at).toLocaleDateString('ar-EG');

        return `
          <div class="stat-card">
            <p class="stat-lesson-name">${title}</p>
            <div class="stat-score-row">
              <span class="stat-score-main">${item.score}/${item.total_questions}</span>
              <span class="stat-score-pct">(${pct}%)</span>
            </div>
            <div class="stat-bottom">
              <span class="stat-date">${date}</span>
              <span class="stat-badge ${passed ? 'pass' : 'fail'}">${passed ? 'ناجح' : 'حاول مجدداً'}</span>
            </div>
          </div>`;
      }).join('');

    } catch (err) {
      console.error('Stats load failed:', err);
      grid.innerHTML = `<div class="stats-empty">تعذّر تحميل البيانات. يرجى تحديث الصفحة.</div>`;
    }
  },
};

window.Profile = Profile;

// Initialise after DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  Profile.init();
});
