(function () {
  const stage = document.getElementById('stage');
  const poolGrid = document.getElementById('poolGrid');

  const RATED_KEY = 'photovote_rated_ids';
  const getRated = () => new Set(JSON.parse(localStorage.getItem(RATED_KEY) || '[]'));
  const saveRated = (set) => localStorage.setItem(RATED_KEY, JSON.stringify([...set]));

  let images = [];
  let activeId = null;
  let ratedIds = getRated();

  async function loadImages() {
    try {
      const res = await fetch('/.netlify/functions/images');
      const data = await res.json();
      images = data.images || [];
    } catch (err) {
      images = [];
    }
    renderPool();
    if (images.length === 0) {
      renderEmpty('No photos yet', 'The admin hasn\u2019t added any photos to the pool. Check back soon.');
      return;
    }
    const firstUnrated = images.find((img) => !ratedIds.has(img.id));
    selectImage(firstUnrated ? firstUnrated.id : images[0].id);
  }

  function renderEmpty(title, body) {
    stage.innerHTML = `
      <div class="stage-empty">
        <h2>${title}</h2>
        <p>${body}</p>
      </div>
    `;
  }

  function renderPool() {
    poolGrid.innerHTML = '';
    images.forEach((img) => {
      const item = document.createElement('div');
      item.className = 'pool-item';
      if (img.id === activeId) item.classList.add('active');
      if (ratedIds.has(img.id)) item.classList.add('rated');

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', `View ${img.filename}`);
      btn.addEventListener('click', () => selectImage(img.id));

      const thumb = document.createElement('img');
      thumb.src = img.dataUrl;
      thumb.alt = img.filename;
      thumb.loading = 'lazy';

      btn.appendChild(thumb);
      item.appendChild(btn);
      poolGrid.appendChild(item);
    });
  }

  function selectImage(id) {
    activeId = id;
    const img = images.find((i) => i.id === id);
    if (!img) return;

    const alreadyRated = ratedIds.has(id);

    stage.innerHTML = `
      <div class="frame-wrap">
        <span class="count-tag">${images.findIndex((i) => i.id === id) + 1} / ${images.length}</span>
        <img src="${img.dataUrl}" alt="${img.filename}" />
      </div>
      <div class="filename-label">${img.filename}</div>
      <div class="scale-hint"><span>1 &mdash; not for me</span><span>10 &mdash; love it</span></div>
      <div class="scale" id="scaleRow"></div>
      <div class="voted-note" id="votedNote">${alreadyRated ? "You've already rated this photo. Feel free to browse the pool." : ''}</div>
    `;

    const scaleRow = document.getElementById('scaleRow');
    for (let i = 1; i <= 10; i++) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'score-btn';
      b.textContent = i;
      b.disabled = alreadyRated;
      b.addEventListener('click', () => submitVote(id, i, b));
      scaleRow.appendChild(b);
    }

    renderPool();
  }

  async function submitVote(imageId, score, btnEl) {
    const scaleRow = document.getElementById('scaleRow');
    [...scaleRow.children].forEach((b) => (b.disabled = true));
    btnEl.classList.add('selected');

    try {
      await fetch('/.netlify/functions/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, score })
      });
      ratedIds.add(imageId);
      saveRated(ratedIds);
      document.getElementById('votedNote').textContent = `Thanks! You rated this photo ${score}/10.`;
      renderPool();

      const nextUnrated = images.find((img) => !ratedIds.has(img.id));
      if (nextUnrated) {
        setTimeout(() => selectImage(nextUnrated.id), 700);
      } else {
        setTimeout(() => {
          renderEmpty('All done!', 'You\u2019ve rated every photo in the pool. Thanks for voting.');
        }, 700);
      }
    } catch (err) {
      document.getElementById('votedNote').textContent = 'Something went wrong submitting your vote. Please try again.';
      [...scaleRow.children].forEach((b) => (b.disabled = false));
      btnEl.classList.remove('selected');
    }
  }

  loadImages();
})();
