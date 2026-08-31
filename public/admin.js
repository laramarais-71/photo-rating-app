(function () {
  const SESSION_KEY = 'photovote_admin_pw';

  const gateView = document.getElementById('gateView');
  const adminView = document.getElementById('adminView');
  const passwordInput = document.getElementById('passwordInput');
  const gateError = document.getElementById('gateError');
  const gateSubmit = document.getElementById('gateSubmit');
  const signOutBtn = document.getElementById('signOutBtn');
  const exportBtn = document.getElementById('exportBtn');
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const uploadStatus = document.getElementById('uploadStatus');
  const imageGrid = document.getElementById('imageGrid');
  const photoCount = document.getElementById('photoCount');

  function getPassword() {
    return sessionStorage.getItem(SESSION_KEY);
  }

  async function tryEnter(pw) {
    // Validate by attempting a real admin call (votes summary) so we never
    // hardcode the password check twice — the server is the source of truth.
    const res = await fetch('/.netlify/functions/votes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw })
    });
    if (res.status === 401) return false;
    if (!res.ok) throw new Error('Server error');
    sessionStorage.setItem(SESSION_KEY, pw);
    return true;
  }

  gateSubmit.addEventListener('click', async () => {
    gateError.textContent = '';
    const pw = passwordInput.value;
    if (!pw) return;
    gateSubmit.disabled = true;
    try {
      const ok = await tryEnter(pw);
      if (ok) {
        showAdmin();
      } else {
        gateError.textContent = 'Incorrect password.';
      }
    } catch (err) {
      gateError.textContent = 'Something went wrong. Please try again.';
    }
    gateSubmit.disabled = false;
  });

  passwordInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') gateSubmit.click();
  });

  signOutBtn.addEventListener('click', () => {
    sessionStorage.removeItem(SESSION_KEY);
    adminView.style.display = 'none';
    gateView.style.display = '';
    passwordInput.value = '';
  });

  function showAdmin() {
    gateView.style.display = 'none';
    adminView.style.display = '';
    loadGallery();
  }

  // ---- Upload ----

  function resizeImage(file, maxDim = 1600, quality = 0.82) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Could not read file'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('Could not decode image'));
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            const scale = maxDim / Math.max(width, height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  async function uploadFiles(files) {
    const pw = getPassword();
    const list = [...files].filter((f) => f.type.startsWith('image/'));
    if (list.length === 0) return;

    let done = 0;
    uploadStatus.textContent = `Uploading 0 / ${list.length}\u2026`;

    for (const file of list) {
      try {
        const dataUrl = await resizeImage(file);
        const res = await fetch('/.netlify/functions/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw, filename: file.name, dataUrl })
        });
        if (!res.ok) throw new Error('Upload failed');
      } catch (err) {
        console.error(err);
      }
      done += 1;
      uploadStatus.textContent = `Uploading ${done} / ${list.length}\u2026`;
    }

    uploadStatus.textContent = `Done. Added ${done} photo${done === 1 ? '' : 's'}.`;
    fileInput.value = '';
    loadGallery();
  }

  fileInput.addEventListener('change', (e) => uploadFiles(e.target.files));

  ['dragenter', 'dragover'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('drag');
    })
  );
  ['dragleave', 'drop'].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('drag');
    })
  );
  dropzone.addEventListener('drop', (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      uploadFiles(e.dataTransfer.files);
    }
  });

  // ---- Gallery ----

  async function loadGallery() {
    imageGrid.innerHTML = '<div class="empty-state">Loading\u2026</div>';
    try {
      const [imgRes, voteRes] = await Promise.all([
        fetch('/.netlify/functions/images'),
        fetch('/.netlify/functions/votes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: getPassword() })
        })
      ]);
      const imgData = await imgRes.json();
      const voteData = await voteRes.json();

      const voteMap = new Map((voteData.results || []).map((r) => [r.id, r]));
      const images = imgData.images || [];

      photoCount.textContent = images.length ? `(${images.length})` : '';

      if (images.length === 0) {
        imageGrid.innerHTML = '<div class="empty-state">No photos uploaded yet. Add some above to build the voting pool.</div>';
        return;
      }

      imageGrid.innerHTML = '';
      images.forEach((img) => {
        const stats = voteMap.get(img.id) || { voteCount: 0, averageScore: 0 };
        const card = document.createElement('div');
        card.className = 'image-card';
        card.innerHTML = `
          <img src="${img.dataUrl}" alt="${img.filename}" />
          <div class="image-card-body">
            <div class="name">${img.filename}</div>
            <div class="stats">${stats.voteCount} vote${stats.voteCount === 1 ? '' : 's'} &middot; avg ${stats.averageScore || 0}</div>
            <button class="btn danger" data-id="${img.id}">Delete</button>
          </div>
        `;
        card.querySelector('button').addEventListener('click', () => deleteImage(img.id));
        imageGrid.appendChild(card);
      });
    } catch (err) {
      imageGrid.innerHTML = '<div class="empty-state">Could not load photos. Please refresh.</div>';
    }
  }

  async function deleteImage(id) {
    if (!confirm('Remove this photo and its votes from the pool?')) return;
    try {
      await fetch('/.netlify/functions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: getPassword(), id })
      });
      loadGallery();
    } catch (err) {
      alert('Could not delete photo. Please try again.');
    }
  }

  // ---- CSV export ----

  function toCsvValue(v) {
    const s = String(v ?? '');
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  exportBtn.addEventListener('click', async () => {
    exportBtn.disabled = true;
    try {
      const res = await fetch('/.netlify/functions/votes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: getPassword() })
      });
      const data = await res.json();
      const rows = data.results || [];

      const header = ['filename', 'image_id', 'uploaded_at', 'vote_count', 'average_score', 'total_score', 'individual_scores'];
      const lines = [header.join(',')];
      rows.forEach((r) => {
        lines.push(
          [
            toCsvValue(r.filename),
            toCsvValue(r.id),
            toCsvValue(r.uploadedAt),
            toCsvValue(r.voteCount),
            toCsvValue(r.averageScore),
            toCsvValue(r.totalScore),
            toCsvValue(r.scores.join(' | '))
          ].join(',')
        );
      });

      const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `photo-vote-results-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not export results. Please try again.');
    }
    exportBtn.disabled = false;
  });

  // ---- Init ----

  if (getPassword()) {
    tryEnter(getPassword())
      .then((ok) => (ok ? showAdmin() : (gateView.style.display = '')))
      .catch(() => (gateView.style.display = ''));
  }
})();
