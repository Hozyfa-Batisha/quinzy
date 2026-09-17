const QuizEngine = {
  lesson: null,
  currentIndex: 0,
  answers: {},
  reviewed: false,
  score: 0,

  init(lesson) {
    this.lesson = lesson;
    this.currentIndex = 0;
    this.answers = {};
    this.reviewed = false;
    this.score = 0;
    this.render();
    this.bindControls();
  },

  get gradableQuestions() {
    return this.lesson.questions.filter((q) => q.type !== 'open');
  },

  bindControls() {
    const prevBtn = document.getElementById('quiz-prev');
    const nextBtn = document.getElementById('quiz-next');
    const submitBtn = document.getElementById('quiz-submit');

    prevBtn.onclick = () => this.goPrev();
    nextBtn.onclick = () => this.goNext();
    submitBtn.onclick = () => this.submit();
  },

  render() {
    const questions = this.lesson.questions;
    const total = questions.length;
    const current = questions[this.currentIndex];

    document.getElementById('quiz-current').textContent = this.currentIndex + 1;
    document.getElementById('quiz-total').textContent = total;
    document.getElementById('quiz-score-value').textContent = this.score;

    const progress = total ? ((this.currentIndex + 1) / total) * 100 : 0;
    document.getElementById('quiz-track-fill').style.width = `${progress}%`;

    const container = document.getElementById('quiz-questions');
    container.innerHTML = current ? this.renderQuestion(current, this.currentIndex) : '<p>لا توجد أسئلة.</p>';

    if (current) {
      this.attachQuestionHandlers(current, this.currentIndex);
      if (this.isAnswerFinal(current, this.currentIndex) || this.reviewed) {
        this.showAnswerState(current, this.currentIndex);
      }
    }

    document.getElementById('quiz-prev').disabled = this.currentIndex === 0;
    document.getElementById('quiz-next').classList.toggle(
      'hidden',
      this.currentIndex >= total - 1
    );
    document.getElementById('quiz-submit').classList.toggle(
      'hidden',
      !(this.currentIndex === total - 1 && !this.reviewed)
    );
  },

  typeLabel(type) {
    const labels = {
      mcq: 'اختيار من متعدد',
      truefalse: 'صح / خطأ',
      matching: 'مزاوجة',
      open: 'سؤال تحليلي',
    };
    return labels[type] || type;
  },

  renderQuestion(q, index) {
    const typeClass = `type-${q.type}`;
    let body = '';

    switch (q.type) {
      case 'mcq':
        body = `
          <ul class="options-list">
            ${q.options
              .map(
                (opt) => `
              <li class="option-item" data-key="${opt.key}">
                <span class="option-key">${opt.key}</span>
                <span class="option-label">${opt.text}</span>
              </li>
            `
              )
              .join('')}
          </ul>
        `;
        break;

      case 'truefalse':
        body = `
          <div class="tf-group">
            <button class="tf-btn" data-value="true" type="button">صح</button>
            <button class="tf-btn" data-value="false" type="button">خطأ</button>
          </div>
        `;
        break;

      case 'matching':
        body = `
          <div class="matching-grid">
            ${q.leftItems
              .map(
                (item, i) => `
              <div class="match-row">
                <div class="match-prompt">${i + 1}. ${item}</div>
                <span class="match-arrow">←</span>
                <select class="match-select" data-index="${i}">
                  <option value="">— اختر الإجابة —</option>
                  ${q.rightOptions.map((opt) => `<option value="${opt}">${opt}</option>`).join('')}
                </select>
              </div>
            `
              )
              .join('')}
          </div>
        `;
        break;

      case 'open':
        body = `
          <textarea class="open-input" placeholder="اكتب إجابتك هنا..."></textarea>
          <div class="model-answer">
            <div class="model-answer-title">الإجابة النموذجية</div>
            <div class="model-answer-text">${q.modelAnswer}</div>
          </div>
        `;
        break;
    }

    return `
      <article class="question-card" data-index="${index}">
        <span class="question-type ${typeClass}">${this.typeLabel(q.type)}</span>
        <div class="question-text">${q.question}</div>
        ${body}
        <div class="feedback"></div>
      </article>
    `;
  },

  attachQuestionHandlers(q, index) {
    const card = document.querySelector(`.question-card[data-index="${index}"]`);
    if (!card) return;

    const saved = this.answers[index];

    switch (q.type) {
      case 'mcq':
        card.querySelectorAll('.option-item').forEach((item) => {
          if (saved === item.dataset.key) item.classList.add('selected');
          item.onclick = () => {
            if (this.reviewed || this.isAnswerFinal(q, index)) return;
            card.querySelectorAll('.option-item').forEach((el) => el.classList.remove('selected'));
            item.classList.add('selected');
            this.answers[index] = item.dataset.key;
            this.answerQuestion(q, index);
          };
        });
        break;

      case 'truefalse':
        card.querySelectorAll('.tf-btn').forEach((btn) => {
          const val = btn.dataset.value === 'true';
          if (saved === val) btn.classList.add('selected');
          btn.onclick = () => {
            if (this.reviewed || this.isAnswerFinal(q, index)) return;
            card.querySelectorAll('.tf-btn').forEach((el) => el.classList.remove('selected'));
            btn.classList.add('selected');
            this.answers[index] = val;
            this.answerQuestion(q, index);
          };
        });
        break;

      case 'matching':
        card.querySelectorAll('.match-select').forEach((select) => {
          const i = Number(select.dataset.index);
          if (saved && saved[i]) select.value = saved[i];
          select.onchange = () => {
            if (this.reviewed || this.isAnswerFinal(q, index)) return;
            if (!this.answers[index]) this.answers[index] = {};
            this.answers[index][i] = select.value;
            if (this.isAnswerFinal(q, index)) this.answerQuestion(q, index);
          };
        });
        break;

      case 'open':
        const textarea = card.querySelector('.open-input');
        if (saved) {
          textarea.value = saved;
          card.querySelector('.model-answer')?.classList.add('show');
        }
        textarea.oninput = () => {
          if (this.reviewed) return;
          this.answers[index] = textarea.value;
        };
        textarea.onblur = () => {
          if (textarea.value.trim()) card.querySelector('.model-answer')?.classList.add('show');
        };
        break;
    }
  },

  isCorrect(q, answer) {
    switch (q.type) {
      case 'mcq':
        return answer === q.correct;
      case 'truefalse':
        return answer === q.correct;
      case 'matching':
        if (!answer) return false;
        return q.leftItems.every((_, i) => answer[i] === q.correctMap[i]);
      default:
        return null;
    }
  },

  isAnswerFinal(q, index) {
    const answer = this.answers[index];
    if (q.type === 'mcq' || q.type === 'truefalse') {
      return Object.prototype.hasOwnProperty.call(this.answers, index);
    }
    if (q.type === 'matching') {
      return Boolean(answer) && q.leftItems.every((_, i) => answer[i]);
    }
    return false;
  },

  answerQuestion(q, index) {
    this.score = this.calculateScore();
    document.getElementById('quiz-score-value').textContent = this.score;
    this.showAnswerState(q, index);
  },

  correctAnswerText(q) {
    if (q.type === 'mcq') {
      const option = q.options.find((item) => item.key === q.correct);
      return `الإجابة الصحيحة: ${q.correct} — ${option?.text ?? ''}`;
    }
    if (q.type === 'truefalse') return `الإجابة الصحيحة: ${q.correct ? 'صح' : 'خطأ'}`;
    if (q.type === 'matching') {
      return q.leftItems.map((item, i) => `${i + 1}. ${item} ← ${q.correctMap[i]}`).join('<br>');
    }
    return '';
  },

  goPrev() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.render();
    }
  },

  goNext() {
    if (this.currentIndex < this.lesson.questions.length - 1) {
      this.currentIndex++;
      this.render();
    }
  },

  calculateScore() {
    let score = 0;
    this.lesson.questions.forEach((q, i) => {
      const result = this.isCorrect(q, this.answers[i]);
      if (result === true) score++;
    });
    return score;
  },

  submit() {
    this.score = this.calculateScore();
    this.reviewed = true;
    this.render();
    ResultsView.show(this);
  },

  showAnswerState(q, index) {
    const card = document.querySelector(`.question-card[data-index="${index}"]`);
    if (!card) return;

    const answer = this.answers[index];
    const feedback = card.querySelector('.feedback');

    if (q.type === 'open') {
      card.querySelector('.model-answer')?.classList.add('show');
      return;
    }

    const correct = this.isCorrect(q, answer);

    if (q.type === 'mcq') {
      card.querySelectorAll('.option-item').forEach((item) => {
        const key = item.dataset.key;
        if (key === q.correct) item.classList.add('correct');
        else if (key === answer && answer !== q.correct) item.classList.add('wrong');
      });
    }

    if (q.type === 'truefalse') {
      card.querySelectorAll('.tf-btn').forEach((btn) => {
        const val = btn.dataset.value === 'true';
        if (val === q.correct) btn.classList.add('correct');
        else if (val === answer && !correct) btn.classList.add('wrong');
      });
    }

    if (q.type === 'matching') {
      card.querySelectorAll('.match-select').forEach((select) => {
        const i = Number(select.dataset.index);
        const expected = q.correctMap[i];
        if (select.value === expected) select.classList.add('correct');
        else if (select.value) select.classList.add('wrong');
      });
    }

    if (feedback) {
      feedback.classList.add('show', correct ? 'correct' : 'wrong');
      if (correct) {
        feedback.innerHTML = `إجابة صحيحة<div class="feedback-answer">${this.correctAnswerText(q)}</div>`;
      } else {
        feedback.innerHTML = `إجابة غير صحيحة<div class="feedback-answer">${this.correctAnswerText(q)}</div>${
          q.explanation ? `<div class="feedback-detail">${q.explanation}</div>` : ''
        }`;
      }
    }
  },

  retry() {
    this.currentIndex = 0;
    this.answers = {};
    this.reviewed = false;
    this.score = 0;
    ResultsView.hide();
    this.render();
  },

  reviewAnswers() {
    ResultsView.hide();
    this.reviewed = true;
    this.render();
  },
};

window.QuizEngine = QuizEngine;
