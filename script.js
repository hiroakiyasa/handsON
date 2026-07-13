(() => {
  const STORAGE_KEY = 'copilot-hands-on-progress-v1';
  const THEME_KEY = 'copilot-hands-on-theme';
  const tasks = [...document.querySelectorAll('[data-task]')];
  const progressRing = document.querySelector('#progressRing');
  const progressPercent = document.querySelector('#progressPercent');
  const progressCount = document.querySelector('#progressCount');
  const progressLabel = document.querySelector('#progressLabel');
  const toast = document.querySelector('#toast');
  let toastTimer;

  const loadProgress = () => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  };

  const state = loadProgress();
  tasks.forEach((task) => { task.checked = Boolean(state[task.dataset.task]); });

  function updateProgress() {
    const done = tasks.filter((task) => task.checked).length;
    const percent = Math.round((done / tasks.length) * 100);
    progressRing.style.setProperty('--progress', `${percent * 3.6}deg`);
    progressPercent.textContent = `${percent}%`;
    progressCount.textContent = `${done} / ${tasks.length} 完了`;
    progressLabel.textContent = percent === 100 ? '完走しました！' : percent >= 70 ? 'あと少しです' : percent > 0 ? 'いい調子です' : 'さあ、始めよう';
    document.querySelector('#completion').classList.toggle('is-complete', percent === 100);
  }

  tasks.forEach((task) => task.addEventListener('change', () => {
    state[task.dataset.task] = task.checked;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateProgress();
  }));
  updateProgress();

  function notify(message = 'コピーしました') {
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      notify();
    } catch {
      const area = document.createElement('textarea');
      area.value = text;
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.append(area);
      area.select();
      document.execCommand('copy');
      area.remove();
      notify();
    }
  }

  document.querySelectorAll('.copy-button').forEach((button) => button.addEventListener('click', () => {
    copyText(button.closest('.prompt-box').querySelector('pre').textContent.trim());
    button.textContent = 'コピー済み ✓';
    setTimeout(() => { button.textContent = 'コピー'; }, 1800);
  }));
  document.querySelectorAll('.mini-copy').forEach((button) => button.addEventListener('click', () => copyText(button.dataset.copy)));

  const dialog = document.querySelector('#imageDialog');
  const dialogImage = dialog.querySelector('img');
  const dialogCaption = dialog.querySelector('p');
  document.querySelectorAll('.zoomable img').forEach((image) => image.addEventListener('click', () => {
    dialogImage.src = image.src;
    dialogImage.alt = image.alt;
    dialogCaption.textContent = image.alt;
    dialog.showModal();
  }));
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => { if (event.target === dialog) dialog.close(); });

  const sections = [...document.querySelectorAll('main section[id]')];
  const navLinks = [...document.querySelectorAll('.chapter-nav a')];
  const observer = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    navLinks.forEach((link) => link.classList.toggle('active', link.hash === `#${visible.target.id}`));
  }, { rootMargin: '-20% 0px -65%', threshold: [0, .25, .6] });
  sections.forEach((section) => observer.observe(section));

  const savedTheme = localStorage.getItem(THEME_KEY);
  if (savedTheme === 'light') document.body.classList.add('light');
  document.querySelector('#themeToggle').addEventListener('click', () => {
    document.body.classList.toggle('light');
    localStorage.setItem(THEME_KEY, document.body.classList.contains('light') ? 'light' : 'dark');
  });

  document.querySelector('#resetProgress').addEventListener('click', () => {
    if (!confirm('保存された進捗をリセットしますか？')) return;
    tasks.forEach((task) => { task.checked = false; });
    localStorage.removeItem(STORAGE_KEY);
    Object.keys(state).forEach((key) => delete state[key]);
    updateProgress();
    notify('進捗をリセットしました');
  });
})();
