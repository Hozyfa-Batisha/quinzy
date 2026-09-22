/**
 * Main App – home page orchestrator
 */
const App = {
  lessons: [],

  init() {
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
      const lessonView = document.getElementById('lesson-view');
      if (lessonView && !lessonView.classList.contains('hidden')) {
        LessonView.close();
      } else {
        window.location.href = '/';
      }
    });
  },
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('home-view')) {
    App.init();
    ScrollReveal.init();
  }
});
