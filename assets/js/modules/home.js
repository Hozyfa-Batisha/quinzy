/* Lesson icon map by keyword */
const LESSON_ICONS = {
  'شبكة': '🌐',  'network': '🌐',
  'أمن': '🔒',   'security': '🔒',
  'قاعدة': '🗄️', 'database': '🗄️',
  'خوارزم': '⚙️','algorithm': '⚙️',
  'برمج': '💻',  'program': '💻',
  'نظام': '🖥️',  'system': '🖥️',
  'ذكاء': '🤖',  'ai': '🤖',
  'سحاب': '☁️',  'cloud': '☁️',
  'ويب': '🌍',   'web': '🌍',
  'default': '📚',
};

function getLessonIcon(title) {
  const lower = title.toLowerCase();
  for (const [key, icon] of Object.entries(LESSON_ICONS)) {
    if (lower.includes(key)) return icon;
  }
  return LESSON_ICONS.default;
}

/* Animated counter */
function animateCounter(el, target, suffix = '') {
  const duration = 900;
  const start = performance.now();
  const startVal = 0;

  function step(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(startVal + (target - startVal) * eased);
    el.textContent = current + suffix;
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

const HomeView = {
  renderLessons(lessons) {
    const technicalGrid = document.getElementById('technical-lessons-grid');
    const otherGrid = document.getElementById('other-lessons-grid');
    if (!technicalGrid || !otherGrid) return;

    const renderCards = (lessonList, startIndex = 0) => lessonList
      .map(
        (lesson, i) => `
      <article class="lesson-card" data-lesson-id="${lesson.id}" style="animation-delay: ${(startIndex + i) * 0.07}s">
        <div class="lesson-card-header">
          <span class="lesson-order">الدرس ${lesson.order}</span>
          <div class="lesson-icon" aria-hidden="true">${getLessonIcon(lesson.titleAr + lesson.titleEn)}</div>
        </div>
        <h3>${lesson.titleAr}</h3>
        <p class="lesson-en">${lesson.titleEn}</p>
        <p class="lesson-desc">${lesson.description}</p>
        <div class="lesson-tags">
          ${lesson.stats.mcq ? `<span class="tag">📝 ${lesson.stats.mcq} اختيار</span>` : ''}
          ${lesson.stats.truefalse ? `<span class="tag">✅ ${lesson.stats.truefalse} صح/خطأ</span>` : ''}
          ${lesson.stats.matching ? `<span class="tag">🔗 ${lesson.stats.matching} مزاوجة</span>` : ''}
          ${lesson.stats.open ? `<span class="tag">💬 ${lesson.stats.open} تحليلي</span>` : ''}
          ${lesson.stats.exercises ? `<span class="tag">🏋️ ${lesson.stats.exercises} تمارين</span>` : ''}
        </div>
        <div class="lesson-card-footer">
          <span class="lesson-meta-text">📊 ${lesson.stats.total} سؤال</span>
          <button class="btn btn-primary" type="button">فتح الدرس ←</button>
        </div>
      </article>
    `
      )
      .join('');

    const technicalLessons = lessons.filter((lesson) => lesson.category === 'technical');
    const otherLessons = lessons.filter((lesson) => lesson.category !== 'technical');
    technicalGrid.innerHTML = renderCards(technicalLessons);
    otherGrid.innerHTML = renderCards(otherLessons, technicalLessons.length);

    document.querySelectorAll('.lessons-grid .lesson-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.lessonId;
        window.App.openLesson(id);
      });
    });
  },

  updateStats(lessons) {
    const totalQuestions = lessons.reduce((sum, l) => sum + l.stats.total, 0);
    const totalLessons = lessons.length;

    const lessonsEl = document.getElementById('stat-lessons');
    const questionsEl = document.getElementById('stat-questions');

    if (lessonsEl) animateCounter(lessonsEl, totalLessons);
    if (questionsEl) animateCounter(questionsEl, totalQuestions, '+');
  },
};

window.HomeView = HomeView;
