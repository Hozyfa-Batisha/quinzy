const LessonView = {
  currentLesson: null,
  activeTab: 'summary',

  open(lesson) {
    this.currentLesson = lesson;
    this.activeTab = 'summary';

    document.getElementById('home-view').classList.add('hidden');
    document.getElementById('lesson-view').classList.remove('hidden');
    document.querySelector('.site-footer')?.classList.add('hidden');
    document.getElementById('site-header')?.classList.add('hidden');

    document.getElementById('viewer-lesson-title').textContent = lesson.titleAr;
    document.getElementById('viewer-breadcrumb-lesson').textContent = lesson.titleAr;

    this.renderSummary();
    QuizEngine.init(lesson);

    this.setTab('summary');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  close() {
    document.getElementById('lesson-view').classList.add('hidden');
    document.getElementById('home-view').classList.remove('hidden');
    document.querySelector('.site-footer')?.classList.remove('hidden');
    document.getElementById('site-header')?.classList.remove('hidden');
    this.currentLesson = null;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  setTab(tab) {
    this.activeTab = tab;

    document.querySelectorAll('.tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    document.getElementById('panel-summary').classList.toggle('active', tab === 'summary');
    document.getElementById('panel-quiz').classList.toggle('active', tab === 'quiz');
  },

  renderSummary() {
    const lesson = this.currentLesson;
    const container = document.getElementById('summary-content');
    if (!container || !lesson) return;

    let html = '';

    if (lesson.objectives) {
      html += `
        <div class="objectives-box">
          <div class="objectives-label">الأهداف التعليمية</div>
          ${lesson.objectives}
        </div>
      `;
    }

    html += `<div class="summary-body">${lesson.summaryHtml}</div>`;

    if (lesson.exercises && lesson.exercises.length) {
      html += `
        <section class="exercises-section">
          <h2>تمارين محلولة</h2>
          ${lesson.exercises
            .map(
              (ex) => `
            <article class="exercise-card">
              <h3>${ex.title}</h3>
              <div class="summary-body">${ex.content}</div>
            </article>
          `
            )
            .join('')}
        </section>
      `;
    }

    html += `
      <div class="summary-test-action">
        <button class="btn btn-primary" type="button" id="start-lesson-test">ابدأ الاختبار</button>
      </div>
    `;

    container.innerHTML = html;
    document.getElementById('start-lesson-test')?.addEventListener('click', () => {
      if (!window.Auth?.currentUser) {
        alert('يجب تسجيل الدخول أولاً لإجراء الاختبار وحفظ نتيجتك.');
        window.Auth?.triggerGoogleLogin();
        return;
      }
      this.setTab('quiz');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  },
};

window.LessonView = LessonView;
