/* ─── Dark Mode ──────────────────────────────────────────────────── */
const ThemeManager = {
  STORAGE_KEY: 'qp-theme',

  init() {
    const saved = localStorage.getItem(this.STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = saved ? saved === 'dark' : prefersDark;
    this.apply(isDark, false);

    document.getElementById('theme-toggle')?.addEventListener('click', () => {
      const currentlyDark = document.documentElement.getAttribute('data-theme') === 'dark';
      this.apply(!currentlyDark, true);
    });
  },

  apply(isDark, animate) {
    const root = document.documentElement;
    if (animate) {
      root.style.transition = 'background 0.45s, color 0.45s';
      setTimeout(() => { root.style.transition = ''; }, 500);
    }
    if (isDark) {
      root.setAttribute('data-theme', 'dark');
      localStorage.setItem(this.STORAGE_KEY, 'dark');
      const knob = document.getElementById('theme-toggle-knob');
      if (knob) knob.textContent = '☀️';
    } else {
      root.removeAttribute('data-theme');
      localStorage.setItem(this.STORAGE_KEY, 'light');
      const knob = document.getElementById('theme-toggle-knob');
      if (knob) knob.textContent = '🌙';
    }
  },
};

/* ─── App ────────────────────────────────────────────────────────── */
const App = {
  lessons: [],

  init() {
    ThemeManager.init();
    this.lessons = window.LESSON_DATA || [];
    HomeView.renderLessons(this.lessons);
    HomeView.updateStats(this.lessons);
    this.bindEvents();
  },

  openLesson(id) {
    const lesson = this.lessons.find((l) => l.id === id);
    if (lesson) LessonView.open(lesson);
  },

  bindEvents() {
    document.getElementById('back-to-lessons')?.addEventListener('click', () => {
      LessonView.close();
    });

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => LessonView.setTab(btn.dataset.tab));
    });

    document.getElementById('results-review')?.addEventListener('click', () => {
      QuizEngine.reviewAnswers();
    });

    document.getElementById('results-retry')?.addEventListener('click', () => {
      QuizEngine.retry();
    });

    document.getElementById('results-overlay')?.addEventListener('click', (e) => {
      if (e.target.id === 'results-overlay') ResultsView.hide();
    });

    document.getElementById('cta-start')?.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('lessons-section')?.scrollIntoView({ behavior: 'smooth' });
    });

    document.getElementById('brand-link')?.addEventListener('click', (e) => {
      e.preventDefault();
      if (!document.getElementById('lesson-view').classList.contains('hidden')) {
        LessonView.close();
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    });
  },
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
  ScrollReveal.init();
});

