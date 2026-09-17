const ResultsView = {
  show(quiz) {
    const gradable = quiz.gradableQuestions.length;
    const score = quiz.score;
    const percent = gradable ? Math.round((score / gradable) * 100) : 0;

    let wrong = 0;
    let openCount = 0;

    quiz.lesson.questions.forEach((q, i) => {
      if (q.type === 'open') openCount++;
      else if (!quiz.isCorrect(q, quiz.answers[i])) wrong++;
    });

    const overlay = document.getElementById('results-overlay');
    document.getElementById('results-score').textContent = `${score} / ${gradable}`;
    document.getElementById('results-percent').textContent = `${percent}%`;
    document.getElementById('results-bar-fill').style.width = `${percent}%`;

    const messageEl = document.getElementById('results-message');
    if (percent >= 90) messageEl.textContent = 'أداء ممتاز — أتقنت محتوى الدرس بشكل جيد.';
    else if (percent >= 70) messageEl.textContent = 'أداء جيد — راجع النقاط التي أخطأت فيها.';
    else if (percent >= 50) messageEl.textContent = 'أداء مقبول — ننصح بمراجعة الملخص ثم إعادة الاختبار.';
    else messageEl.textContent = 'تحتاج إلى مراجعة أوسع — اقرأ الملخص بعناية ثم حاول مجدداً.';

    // Save progress if logged in
    if (window.Auth?.currentUser) {
      window.API.saveProgress(quiz.lesson.id, score, gradable, percent >= 50)
        .catch(err => console.error('Failed to save progress:', err));
    }

    document.getElementById('breakdown-correct').textContent = score;
    document.getElementById('breakdown-wrong').textContent = wrong;
    document.getElementById('breakdown-open').textContent = openCount;

    overlay.classList.remove('hidden');
  },

  hide() {
    document.getElementById('results-overlay').classList.add('hidden');
  },
};

window.ResultsView = ResultsView;
