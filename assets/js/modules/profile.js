/**
 * Profile Module
 */
const Profile = {
  async render() {
    const grid = document.getElementById('profile-stats-grid');
    if (!grid) return;

    if (!window.Auth.currentUser) {
      grid.innerHTML = '<p class="empty-state">يرجى تسجيل الدخول لعرض الإحصائيات.</p>';
      return;
    }

    grid.innerHTML = '<p class="empty-state">جاري تحميل البيانات...</p>';

    try {
      const progressList = await window.API.getProgress();
      
      if (!progressList || progressList.length === 0) {
        grid.innerHTML = '<p class="empty-state">لم تقم بإجراء أي اختبارات بعد.</p>';
        return;
      }

      let html = '';
      progressList.forEach(item => {
        // Find lesson details from window.LESSON_DATA
        const lesson = window.LESSON_DATA?.find(l => l.id === item.lesson_id);
        const title = lesson ? lesson.titleAr : item.lesson_id;
        const percentage = Math.round((item.score / item.total_questions) * 100);
        const statusClass = item.passed ? 'status-pass' : 'status-fail';
        const statusText = item.passed ? 'ناجح' : 'حاول مرة أخرى';
        const date = new Date(item.created_at).toLocaleDateString('ar-EG');

        html += `
          <div class="stat-card">
            <h4>${title}</h4>
            <div class="stat-details">
              <div class="stat-score">
                <span class="score-value">${item.score}/${item.total_questions}</span>
                <span class="score-pct">(${percentage}%)</span>
              </div>
              <div class="stat-status ${statusClass}">${statusText}</div>
            </div>
            <div class="stat-date">${date}</div>
          </div>
        `;
      });

      grid.innerHTML = html;
    } catch (err) {
      console.error(err);
      grid.innerHTML = '<p class="empty-state">حدث خطأ أثناء تحميل البيانات.</p>';
    }
  }
};

window.Profile = Profile;
