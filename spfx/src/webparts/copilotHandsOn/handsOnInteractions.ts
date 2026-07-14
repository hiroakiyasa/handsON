import type { IHandsOnProgress, ProgressService } from './ProgressService';

export interface IHandsOnOptions {
  enableProgress: boolean;
  displayName: string;
  videoUrls: Record<string, string>;
  resolveVideoEmbedUrl: (url: string) => Promise<string>;
}

const TEXT_SIZE_KEY = 'copilot-hands-on-text-size';

export async function initializeHandsOn(
  root: ShadowRoot,
  progressService: ProgressService,
  options: IHandsOnOptions
): Promise<void> {
  const tasks = Array.from(root.querySelectorAll<HTMLInputElement>('[data-task]'));
  const progressRing = root.querySelector<HTMLElement>('#progressRing');
  const progressPercent = root.querySelector<HTMLElement>('#progressPercent');
  const progressCount = root.querySelector<HTMLElement>('#progressCount');
  const progressLabel = root.querySelector<HTMLElement>('#progressLabel');
  const saveState = root.querySelector<HTMLElement>('.save-state');
  const toast = root.querySelector<HTMLElement>('#toast');
  const wrapper = root.querySelector<HTMLElement>('.hands-on-body');
  let state: IHandsOnProgress = {};
  let saveTimer: number | undefined;
  let toastTimer: number | undefined;

  const notify = (message: string = 'コピーしました'): void => {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.remove('show'), 1800);
  };

  const updateProgress = (): void => {
    const done = tasks.filter(task => task.checked).length;
    const percent = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    progressRing?.style.setProperty('--progress', `${percent * 3.6}deg`);
    if (progressPercent) progressPercent.textContent = `${percent}%`;
    if (progressCount) progressCount.textContent = `${done} / ${tasks.length} 完了`;
    if (progressLabel) progressLabel.textContent = percent === 100 ? '完走しました！' : percent >= 70 ? 'あと少しです' : percent > 0 ? 'いい調子です' : 'さあ、始めよう';
    root.querySelector('#completion')?.classList.toggle('is-complete', percent === 100);
  };

  const disableProgress = (message: string): void => {
    root.querySelector('.progress-card')?.remove();
    root.querySelector('#resetProgress')?.remove();
    tasks.forEach(task => {
      task.checked = false;
      task.disabled = true;
      task.closest('.task')?.classList.add('progress-disabled');
      task.nextElementSibling?.remove();
      task.remove();
    });
    if (saveState) saveState.textContent = message;
  };

  if (options.enableProgress) {
    try {
      if (saveState) saveState.textContent = '進捗を読み込み中…';
      await progressService.initialize();
      state = await progressService.load();
      tasks.forEach(task => { task.checked = Boolean(state[task.dataset.task || '']); });
      updateProgress();
      if (saveState) saveState.innerHTML = `<i></i>${escapeHtml(options.displayName)} さんの進捗を保存`;

      tasks.forEach(task => task.addEventListener('change', () => {
        const taskId = task.dataset.task;
        if (!taskId) return;
        state[taskId] = task.checked;
        updateProgress();
        if (saveState) saveState.textContent = '保存中…';
        if (saveTimer) window.clearTimeout(saveTimer);
        saveTimer = window.setTimeout(() => {
          progressService.save(state)
            .then(() => { if (saveState) saveState.innerHTML = `<i></i>${escapeHtml(options.displayName)} さんの進捗を保存済み`; })
            .catch(() => { if (saveState) saveState.textContent = '保存できませんでした'; });
        }, 500);
      }));
    } catch (error) {
      console.error(error);
      disableProgress('進捗機能は現在利用できません');
    }
  } else {
    disableProgress('');
    saveState?.remove();
  }

  root.querySelector('#resetProgress')?.addEventListener('click', () => {
    if (!window.confirm('あなたの保存済み進捗をリセットしますか？')) return;
    tasks.forEach(task => { task.checked = false; });
    state = {};
    updateProgress();
    progressService.save(state).then(() => notify('進捗をリセットしました')).catch(() => notify('リセットを保存できませんでした'));
  });

  root.querySelectorAll<HTMLButtonElement>('.copy-button').forEach(button => button.addEventListener('click', () => {
    const text = button.closest('.prompt-box')?.querySelector('pre')?.textContent?.trim() || '';
    copyText(text).then(() => notify()).catch(() => notify('コピーできませんでした'));
    button.textContent = 'コピー済み ✓';
    window.setTimeout(() => { button.textContent = 'コピー'; }, 1800);
  }));
  root.querySelectorAll<HTMLButtonElement>('.mini-copy').forEach(button => button.addEventListener('click', () => {
    copyText(button.dataset.copy || '').then(() => notify()).catch(() => notify('コピーできませんでした'));
  }));

  root.querySelector('#video-setup')?.remove();
  const videoLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('[data-video]'));
  for (const link of videoLinks) {
    const key = link.dataset.video || '';
    const url = normalizeVideoUrl(options.videoUrls[key] || '');
    if (!url) {
      link.removeAttribute('href');
      link.classList.add('is-disabled');
      link.title = 'ページ編集者が動画URLを設定すると視聴できます';
      link.addEventListener('click', event => {
        event.preventDefault();
        notify('この動画はまだ設定されていません');
      });
      continue;
    }

    // 埋め込みに失敗しても、元のSharePointリンクから必ず視聴できます。
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const frame = document.createElement('div');
    frame.className = 'embedded-video';
    frame.innerHTML = '<div class="video-loading">SharePointから動画を読み込んでいます…</div>';
    link.closest('.case-head')?.insertAdjacentElement('afterend', frame);

    try {
      const embedUrl = await options.resolveVideoEmbedUrl(url);
      frame.innerHTML = `<iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(link.textContent || '紹介動画')}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    } catch (error) {
      console.error('SharePoint動画をページ内表示できませんでした。', error);
      frame.innerHTML = '<div class="video-error">ページ内プレーヤーを読み込めませんでした。上の「動画を見る」からSharePointで再生してください。</div>';
    }
  }

  const dialog = root.querySelector<HTMLDialogElement>('#imageDialog');
  const dialogImage = dialog?.querySelector<HTMLImageElement>('img');
  const dialogCaption = dialog?.querySelector<HTMLElement>('p');
  root.querySelectorAll<HTMLImageElement>('.zoomable img').forEach(image => image.addEventListener('click', () => {
    if (!dialog || !dialogImage || !dialogCaption) return;
    dialogImage.src = image.src;
    dialogImage.alt = image.alt;
    dialogCaption.textContent = image.alt;
    dialog.showModal();
  }));
  dialog?.querySelector('button')?.addEventListener('click', () => dialog.close());
  dialog?.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });

  root.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(link => link.addEventListener('click', event => {
    const target = root.querySelector(link.hash);
    if (!target) return;
    event.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  if (localStorage.getItem(TEXT_SIZE_KEY) === 'large') wrapper?.classList.add('large-text');
  root.querySelector('#themeToggle')?.addEventListener('click', () => {
    wrapper?.classList.toggle('large-text');
    localStorage.setItem(TEXT_SIZE_KEY, wrapper?.classList.contains('large-text') ? 'large' : 'normal');
  });
}

function normalizeVideoUrl(value: string): string {
  const iframeSrc = value.match(/src=["']([^"']+)["']/i)?.[1];
  const url = (iframeSrc || value).trim();
  return /^https:\/\//i.test(url) ? url : '';
}

async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.append(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character] || character));
}
