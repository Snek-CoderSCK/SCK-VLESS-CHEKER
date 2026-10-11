/**
 * SCK — Minimalist VLESS Client Script (iOS & Multi-Platform Standard)
 * Полностью векторные SVG-иконки, отсутствие эмодзи-глифов и поддержка Karing.
 */

const KEYS_URL = 'keys.json';
let data = null;
let currentSection = 'vpn'; // 'vpn' | 'white' | 'chunks'
let currentMode = null;
let searchQuery = '';
let toastTimeout = null;

/** Библиотека векторных SVG флагов (никаких эмодзи, идеальный рендеринг на Windows, iOS, Android) */
const SVG_FLAGS = {
  baltics: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#0072CE"/><path d="M0 0h24v5.33H0z" fill="#FDB913"/><path d="M0 10.67h24v5.33H0z" fill="#9E3039"/></svg>`,
  w_baltics: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#0072CE"/><path d="M0 0h24v5.33H0z" fill="#FDB913"/><path d="M0 10.67h24v5.33H0z" fill="#9E3039"/></svg>`,
  finland: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#FFFFFF"/><path d="M0 6h24v4H0zM7 0h4v16H7z" fill="#003580"/></svg>`,
  w_finland: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#FFFFFF"/><path d="M0 6h24v4H0zM7 0h4v16H7z" fill="#003580"/></svg>`,
  germany: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#FFCC00"/><path d="M0 0h24v5.33H0z" fill="#000000"/><path d="M0 5.33h24v5.34H0z" fill="#DD0000"/></svg>`,
  w_germany: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#FFCC00"/><path d="M0 0h24v5.33H0z" fill="#000000"/><path d="M0 5.33h24v5.34H0z" fill="#DD0000"/></svg>`,
  sweden: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#006AA7"/><path d="M0 6h24v4H0zM7 0h4v16H7z" fill="#FECC00"/></svg>`,
  w_sweden: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#006AA7"/><path d="M0 6h24v4H0zM7 0h4v16H7z" fill="#FECC00"/></svg>`,
  netherlands: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#FFFFFF"/><path d="M0 0h24v5.33H0z" fill="#AE1C28"/><path d="M0 10.67h24v5.33H0z" fill="#21468B"/></svg>`,
  w_netherlands: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#FFFFFF"/><path d="M0 0h24v5.33H0z" fill="#AE1C28"/><path d="M0 10.67h24v5.33H0z" fill="#21468B"/></svg>`,
  poland: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#FFFFFF"/><path d="M0 8h24v8H0z" fill="#DC143C"/></svg>`,
  w_poland: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#FFFFFF"/><path d="M0 8h24v8H0z" fill="#DC143C"/></svg>`,
  russia: `<svg viewBox="0 0 24 16" width="20" height="13" class="flag-svg"><rect width="24" height="16" rx="2" fill="#FFFFFF"/><path d="M0 5.33h24v5.34H0z" fill="#0039A6"/><path d="M0 10.67h24v5.33H0z" fill="#D52B1E"/></svg>`,
  other: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="flag-svg"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`,
  w_other: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" class="flag-svg"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
};

function getModeFlagSvg(modeKey) {
  return SVG_FLAGS[modeKey] || SVG_FLAGS.other;
}

const MODES = [
  { key: 'baltics',       label: 'Прибалтика', section: 'vpn' },
  { key: 'finland',       label: 'Финляндия',  section: 'vpn' },
  { key: 'germany',       label: 'Германия',   section: 'vpn' },
  { key: 'sweden',        label: 'Швеция',     section: 'vpn' },
  { key: 'netherlands',   label: 'Нидерланды', section: 'vpn' },
  { key: 'poland',        label: 'Польша',     section: 'vpn' },
  { key: 'other',         label: 'Остальные страны', section: 'vpn' },

  { key: 'w_baltics',     label: 'Прибалтика', section: 'white' },
  { key: 'w_finland',     label: 'Финляндия',  section: 'white' },
  { key: 'w_germany',     label: 'Германия',   section: 'white' },
  { key: 'w_sweden',      label: 'Швеция',     section: 'white' },
  { key: 'w_netherlands', label: 'Нидерланды', section: 'white' },
  { key: 'w_poland',      label: 'Польша',     section: 'white' },
  { key: 'w_other',       label: 'Остальные страны', section: 'white' },
  { key: 'russia',        label: 'Россия (Москва)', section: 'white' },
];

let allUniqueKeys = [];
let allChunks = [];

/** Парсер параметров VLESS */
function parseVlessDetails(key) {
  if (!key || typeof key !== 'string') {
    return { host: '?', port: '443', type: 'TCP', security: 'REALITY', sni: '', flow: '', fp: '' };
  }
  try {
    const withoutScheme = key.slice('vless://'.length);
    const atIdx = withoutScheme.indexOf('@');
    const afterAt = atIdx !== -1 ? withoutScheme.slice(atIdx + 1) : withoutScheme;
    const [hostPort, queryFragment] = afterAt.split('?');
    const [queryString] = (queryFragment || '').split('#');
    const params = new URLSearchParams(queryString || '');

    let host = hostPort || '?';
    let port = '443';
    if (hostPort.startsWith('[') && hostPort.includes(']')) {
      const bIdx = hostPort.lastIndexOf(']');
      host = hostPort.slice(1, bIdx);
      const rest = hostPort.slice(bIdx + 1);
      if (rest.startsWith(':')) port = rest.slice(1);
    } else if (hostPort.includes(':')) {
      const parts = hostPort.split(':');
      host = parts[0];
      port = parts[1] || '443';
    }

    const type = (params.get('type') || 'tcp').toUpperCase();
    const security = (params.get('security') || 'none').toUpperCase();
    const sni = params.get('sni') || host;
    const flow = params.get('flow') || '';
    const fp = params.get('fp') || '';

    return { host, port, type, security, sni, flow, fp };
  } catch (e) {
    return { host: '?', port: '443', type: 'TCP', security: 'REALITY', sni: '', flow: '', fp: '' };
  }
}

/** Загрузка данных */
async function loadData() {
  const updatedEl = document.getElementById('updated');
  if (updatedEl) updatedEl.innerHTML = '<span class="spinner"></span>Обновление данных...';

  try {
    const resp = await fetch(KEYS_URL + '?t=' + Date.now());
    if (!resp.ok) throw new Error('Ошибка HTTP: ' + resp.status);
    data = await resp.json();
    processData();
    renderAll();
  } catch (err) {
    console.error('Ошибка загрузки данных:', err);
    if (updatedEl) updatedEl.textContent = 'Не удалось загрузить keys.json';
  }
}

/** Обработка данных */
function processData() {
  if (!data) return;

  const keyMap = new Map();
  let minLatency = 9999;

  function collect(items) {
    if (!Array.isArray(items)) return;
    items.forEach(it => {
      if (it && it.key) {
        if (!keyMap.has(it.key) || (it.latency_ms && it.latency_ms < keyMap.get(it.key).latency_ms)) {
          keyMap.set(it.key, it);
        }
        if (it.latency_ms && it.latency_ms < minLatency) {
          minLatency = it.latency_ms;
        }
      }
    });
  }

  MODES.forEach(m => {
    if (m.key !== 'other' && data[m.key]) {
      collect(data[m.key].top10 || data[m.key].top5);
    }
  });

  if (data.other_countries) {
    Object.values(data.other_countries).forEach(c => {
      collect(c.top10 || c.top5);
    });
  }

  allUniqueKeys = Array.from(keyMap.values()).sort((a, b) => (a.latency_ms || 9999) - (b.latency_ms || 9999));

  if (data.chunks_info && Array.isArray(data.chunks_info.chunks)) {
    allChunks = data.chunks_info.chunks;
  } else {
    const chunkSize = 60;
    const totalChunks = Math.ceil(allUniqueKeys.length / chunkSize);
    allChunks = [];
    for (let i = 0; i < totalChunks; i++) {
      const slice = allUniqueKeys.slice(i * chunkSize, (i + 1) * chunkSize);
      const avg = slice.length
        ? Math.round(slice.reduce((acc, k) => acc + (k.latency_ms || 0), 0) / slice.length * 10) / 10
        : 0;
      allChunks.push({
        part: i + 1,
        count: slice.length,
        avg_latency: avg,
        file: `chunks/part_${i + 1}.txt`,
        keys: slice.map(s => s.key),
        hosts: slice.slice(0, 5).map(s => `${s.host}:${s.port} (${s.latency_ms} ms)`),
      });
    }
  }

  const totalCountEl = document.getElementById('metric-total');
  const bestPingEl = document.getElementById('metric-best-ping');
  const chunksCountEl = document.getElementById('metric-chunks');
  const chunksBadge = document.getElementById('chunks-count-badge');

  if (totalCountEl) totalCountEl.textContent = allUniqueKeys.length;
  if (bestPingEl) bestPingEl.textContent = minLatency < 9999 ? minLatency + ' мс' : '—';
  if (chunksCountEl) chunksCountEl.textContent = allChunks.length;
  if (chunksBadge) chunksBadge.textContent = allChunks.length;
}

/** Рендеринг всего */
function renderAll() {
  renderUpdatedTime();
  renderTabs();
  renderCards();
  renderChunks();

  if (!currentMode) {
    const firstActiveVpn = MODES.find(m => m.section === 'vpn' && hasWorkingKeys(m.key));
    selectMode(firstActiveVpn ? firstActiveVpn.key : 'baltics');
  } else {
    selectMode(currentMode);
  }
}

function renderUpdatedTime() {
  const updatedEl = document.getElementById('updated');
  if (!updatedEl) return;
  if (!data || !data.updated_at) {
    updatedEl.textContent = 'Обновлено недавно';
    return;
  }

  try {
    const utcStr = data.updated_at;
    const d = new Date(utcStr.replace(' ', 'T').replace(' UTC', 'Z'));
    if (!isNaN(d.getTime())) {
      const msk = new Date(d.getTime() + 3 * 60 * 60 * 1000);
      const formatted = msk.toISOString().slice(0, 16).replace('T', ' ') + ' МСК';
      updatedEl.textContent = 'Обновлено: ' + formatted;
      return;
    }
  } catch (e) {}

  updatedEl.textContent = 'Обновлено: ' + data.updated_at;
}

function hasWorkingKeys(modeKey) {
  if (!data) return false;
  if (modeKey === 'other') {
    return Boolean(data.other_countries && Object.values(data.other_countries).some(c => c.total_working > 0));
  }
  return Boolean(data[modeKey] && data[modeKey].total_working > 0);
}

function getWorkingCount(modeKey) {
  if (!data) return 0;
  if (modeKey === 'other') {
    if (!data.other_countries) return 0;
    return Object.values(data.other_countries).reduce((acc, c) => acc + (c.total_working || 0), 0);
  }
  return data[modeKey] ? (data[modeKey].total_working || 0) : 0;
}

/** Рендеринг вкладок стран с векторными SVG флагами */
function renderTabs() {
  const vpnTabsContainer = document.getElementById('tabs-countries');
  const whiteTabsContainer = document.getElementById('tabs-white');
  const vpnCollapsed = document.getElementById('tabs-collapsed');
  const whiteCollapsed = document.getElementById('tabs-collapsed-white');

  if (!vpnTabsContainer || !whiteTabsContainer) return;

  vpnTabsContainer.innerHTML = '';
  whiteTabsContainer.innerHTML = '';
  if (vpnCollapsed) vpnCollapsed.innerHTML = '';
  if (whiteCollapsed) whiteCollapsed.innerHTML = '';

  let vpnEmptyCount = 0;
  let whiteEmptyCount = 0;

  MODES.forEach(m => {
    const count = getWorkingCount(m.key);
    const hasKeys = count > 0;
    const tabBtn = document.createElement('button');
    tabBtn.className = 'tab';
    tabBtn.dataset.mode = m.key;

    // Вставляем векторный флаг SVG вместо проблемных эмодзи
    const flagSvg = getModeFlagSvg(m.key);
    tabBtn.innerHTML = `
      <span class="tab-flag-wrap">${flagSvg}</span>
      <span class="tab-name">${escapeHtml(m.label)}</span>
      ${hasKeys ? `<span class="tab-count">${count}</span>` : ''}
    `;
    tabBtn.onclick = () => selectMode(m.key);

    if (m.section === 'vpn') {
      if (hasKeys) {
        vpnTabsContainer.appendChild(tabBtn);
      } else {
        tabBtn.disabled = true;
        if (vpnCollapsed) vpnCollapsed.appendChild(tabBtn);
        vpnEmptyCount++;
      }
    } else {
      if (hasKeys) {
        whiteTabsContainer.appendChild(tabBtn);
      } else {
        tabBtn.disabled = true;
        if (whiteCollapsed) whiteCollapsed.appendChild(tabBtn);
        whiteEmptyCount++;
      }
    }
  });

  setupCollapsedToggle('collapsed-toggle', 'collapsed-label', vpnEmptyCount);
  setupCollapsedToggle('collapsed-toggle-white', 'collapsed-label-white', whiteEmptyCount);
}

function setupCollapsedToggle(toggleId, labelId, count) {
  const toggle = document.getElementById(toggleId);
  const label = document.getElementById(labelId);
  if (!toggle || !label) return;
  if (count > 0) {
    label.textContent = `Без активных ключей: ${count}`;
    toggle.style.display = 'inline-flex';
  } else {
    toggle.style.display = 'none';
  }
}

function toggleCollapsed(section) {
  const isVpn = section === 'vpn';
  const toggle = document.getElementById(isVpn ? 'collapsed-toggle' : 'collapsed-toggle-white');
  const drawer = document.getElementById(isVpn ? 'tabs-collapsed' : 'tabs-collapsed-white');
  if (toggle && drawer) {
    toggle.classList.toggle('open');
    drawer.classList.toggle('open');
  }
}

function switchSection(section) {
  currentSection = section;

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });

  const vpnSection = document.getElementById('section-vpn');
  const whiteSection = document.getElementById('section-white');
  const chunksSection = document.getElementById('section-chunks');
  const cardsContainer = document.getElementById('cards-container');
  const searchContainer = document.getElementById('search-container');
  const filterChips = document.getElementById('filter-chips');

  if (section === 'vpn') {
    if (vpnSection) vpnSection.style.display = 'block';
    if (whiteSection) whiteSection.style.display = 'none';
    if (chunksSection) chunksSection.style.display = 'none';
    if (cardsContainer) cardsContainer.style.display = 'block';
    if (searchContainer) searchContainer.style.display = 'flex';
    if (filterChips) filterChips.style.display = 'flex';
    if (!currentMode || !MODES.some(m => m.key === currentMode && m.section === 'vpn')) {
      const first = MODES.find(m => m.section === 'vpn' && hasWorkingKeys(m.key));
      selectMode(first ? first.key : 'baltics');
    } else {
      selectMode(currentMode);
    }
  } else if (section === 'white') {
    if (vpnSection) vpnSection.style.display = 'none';
    if (whiteSection) whiteSection.style.display = 'block';
    if (chunksSection) chunksSection.style.display = 'none';
    if (cardsContainer) cardsContainer.style.display = 'block';
    if (searchContainer) searchContainer.style.display = 'flex';
    if (filterChips) filterChips.style.display = 'flex';
    if (!currentMode || !MODES.some(m => m.key === currentMode && m.section === 'white')) {
      const first = MODES.find(m => m.section === 'white' && hasWorkingKeys(m.key));
      selectMode(first ? first.key : 'w_baltics');
    } else {
      selectMode(currentMode);
    }
  } else if (section === 'chunks') {
    if (vpnSection) vpnSection.style.display = 'none';
    if (whiteSection) whiteSection.style.display = 'none';
    if (chunksSection) chunksSection.style.display = 'block';
    if (cardsContainer) cardsContainer.style.display = 'none';
    if (searchContainer) searchContainer.style.display = 'none';
    if (filterChips) filterChips.style.display = 'none';
  }
}

function selectMode(modeKey) {
  currentMode = modeKey;

  document.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === modeKey);
  });

  MODES.forEach(m => {
    const cardEl = document.getElementById('card-' + m.key);
    if (cardEl) {
      cardEl.style.display = m.key === modeKey ? 'block' : 'none';
    }
  });
}

function renderCards() {
  const container = document.getElementById('cards-container');
  if (!container) return;
  container.innerHTML = '';

  MODES.forEach(m => {
    const card = document.createElement('div');
    card.className = 'card';
    card.id = 'card-' + m.key;
    card.style.display = 'none';

    const flagSvg = getModeFlagSvg(m.key);
    card.innerHTML = `
      <div class="card-header">
        <h2 class="card-title">
          <span class="card-flag-wrap">${flagSvg}</span>
          <span>${escapeHtml(m.label)}</span>
        </h2>
        <span class="card-stats" id="stats-${m.key}">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Загрузка...
        </span>
      </div>
      <div id="content-${m.key}"></div>
    `;

    container.appendChild(card);
    fillCardContent(m.key);
  });
}

/** Детализированное наполнение карточки (без эмодзи) */
function fillCardContent(modeKey) {
  const contentEl = document.getElementById('content-' + modeKey);
  const statsEl = document.getElementById('stats-' + modeKey);
  if (!contentEl || !data) return;

  if (modeKey === 'other' && data.other_countries) {
    if (statsEl) {
      statsEl.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>
        <span>Стран: ${Object.keys(data.other_countries).length}</span>
      `;
    }
    const sorted = Object.entries(data.other_countries)
      .filter(([, c]) => c.total_working > 0)
      .sort((a, b) => b[1].total_working - a[1].total_working);

    if (sorted.length === 0) {
      contentEl.innerHTML = '<div class="key-box empty">Нет рабочих серверов для других стран</div>';
      return;
    }

    contentEl.innerHTML = sorted.map(([name, c]) => renderOtherCountryBlock(name, c)).join('');
    return;
  }

  const d = data[modeKey];
  if (!d) {
    if (statsEl) statsEl.textContent = 'Нет данных';
    contentEl.innerHTML = '<div class="key-box empty">Данные отсутствуют</div>';
    return;
  }

  if (statsEl) {
    statsEl.innerHTML = `
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
      <span>Рабочих: ${d.total_working || 0} из ${d.total || 0}</span>
    `;
  }

  if (!d.best) {
    contentEl.innerHTML = `
      <div class="key-box empty">
        Рабочих ключей в этом регионе сейчас нет.<br>
        Попробуйте выбрать соседнюю страну или загляните позже.
      </div>
    `;
    return;
  }

  const bestLatency = d.top10 && d.top10[0] ? d.top10[0].latency_ms : null;
  const bestHost = d.top10 && d.top10[0] ? `${d.top10[0].host}:${d.top10[0].port}` : '';
  const bestSeen = d.top10 && d.top10[0] ? d.top10[0].first_seen : null;
  const details = parseVlessDetails(d.best);

  let html = `
    <div class="best-key-section">
      <div class="section-subtitle">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
        <span>ЛУЧШИЙ СЕРВЕР (МИНИМАЛЬНЫЙ ПИНГ)</span>
      </div>

      <div class="spec-badges-row">
        <span class="badge-spec proto">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
          VLESS
        </span>
        <span class="badge-spec ${details.security === 'REALITY' ? 'sec-reality' : 'sec-tls'}">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          ${details.security}
        </span>
        <span class="badge-spec trans">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><path d="M1.42 9a16 16 0 0 1 21.16 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
          ${details.type}
        </span>
        ${details.sni ? `
          <span class="badge-spec sni" title="SNI: ${escapeHtml(details.sni)}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>
            ${escapeHtml(details.sni)}
          </span>
        ` : ''}
        ${details.flow ? `<span class="badge-spec trans">${escapeHtml(details.flow)}</span>` : ''}
      </div>

      <div class="key-box" id="key-text-${modeKey}" onclick="copyKeyText('${modeKey}')" title="Нажмите, чтобы скопировать">${escapeHtml(d.best)}</div>

      <div class="key-meta-bar">
        <div class="key-tags">
          ${bestLatency !== null ? `
            <span class="tag-latency">
              <span class="tag-latency-dot"></span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
              ${bestLatency} мс
            </span>
          ` : ''}
          ${bestHost ? `
            <span class="tag-uptime">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
              ${bestHost}
            </span>
          ` : ''}
          ${bestSeen ? `
            <span class="tag-uptime">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              в сети ${formatUptime(bestSeen)}
            </span>
          ` : ''}
        </div>
      </div>

      <button class="btn-primary copy-main-btn" id="btn-copy-${modeKey}" onclick="copyKeyText('${modeKey}')">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>Скопировать лучший ключ</span>
      </button>
    </div>
  `;

  const topList = d.top10 || d.top5 || [];
  if (topList.length > 0) {
    html += `
      <div class="top-servers-section">
        <div class="section-subtitle">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
          <span>ТОП-${topList.length} БЫСТРЫХ СЕРВЕРОВ</span>
        </div>
        <div class="server-list">
          ${topList.map((item, idx) => {
            const itemDet = parseVlessDetails(item.key);
            const rankClass = idx === 0 ? 'rank-1' : idx === 1 ? 'rank-2' : idx === 2 ? 'rank-3' : 'rank-other';
            const rankIcon = idx === 0
              ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z"/></svg> 1`
              : idx === 1
              ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="6"/><path d="M15.48 13.52L17.5 22l-5.5-3-5.5 3 2.02-8.48"/></svg> 2`
              : idx === 2
              ? `<svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="6"/><path d="M15.48 13.52L17.5 22l-5.5-3-5.5 3 2.02-8.48"/></svg> 3`
              : `${idx + 1}`;

            return `
              <div class="server-item">
                <div class="server-left">
                  <span class="server-rank ${rankClass}">${rankIcon}</span>
                  <div class="server-details">
                    <span class="server-host" title="${escapeHtml(item.host)}:${item.port}">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mini-server-icon"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                      ${escapeHtml(item.host)}:${item.port}
                    </span>
                    <div class="server-pills">
                      <span class="mini-pill">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12.55a11 11 0 0 1 14.08 0"></path><line x1="12" y1="20" x2="12.01" y2="20"></line></svg>
                        ${itemDet.type}
                      </span>
                      <span class="mini-pill">
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        ${itemDet.security}
                      </span>
                      ${itemDet.sni ? `
                        <span class="mini-pill">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line></svg>
                          ${escapeHtml(itemDet.sni)}
                        </span>
                      ` : ''}
                    </div>
                  </div>
                </div>
                <div class="server-right">
                  <span class="server-ping">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                    ${item.latency_ms} мс
                  </span>
                  ${item.first_seen ? `
                    <span class="server-uptime">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      ${formatUptime(item.first_seen)}
                    </span>
                  ` : ''}
                  <button class="btn-icon-copy" data-key="${escapeHtml(item.key)}" onclick="copySpecificKey(this)">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                    <span>копировать</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  contentEl.innerHTML = html;
}

/** Рендеринг стран из Other (очищенный от эмодзи, только векторный глобус) */
function renderOtherCountryBlock(name, c) {
  // Очищаем любое случайное эмодзи из строки имени
  const cleanName = name.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]/g, '').trim();
  const globeSvg = SVG_FLAGS.other;
  const topList = c.top10 || c.top5 || [];

  return `
    <div class="country-block">
      <div class="country-title">
        <span class="country-name-wrap">
          <span class="card-flag-wrap">${globeSvg}</span>
          <span>${escapeHtml(cleanName || 'Другой регион')}</span>
        </span>
        <span class="card-stats">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ${c.total_working} из ${c.total}
        </span>
      </div>
      <div class="server-list">
        ${topList.map((item, idx) => {
          const itemDet = parseVlessDetails(item.key);
          return `
            <div class="server-item">
              <div class="server-left">
                <span class="server-rank rank-other">${idx + 1}</span>
                <div class="server-details">
                  <span class="server-host">${escapeHtml(item.host)}:${item.port}</span>
                  <div class="server-pills">
                    <span class="mini-pill">${itemDet.type}</span>
                    <span class="mini-pill">${itemDet.security}</span>
                  </div>
                </div>
              </div>
              <div class="server-right">
                <span class="server-ping">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                  ${item.latency_ms} мс
                </span>
                <button class="btn-icon-copy" data-key="${escapeHtml(item.key)}" onclick="copySpecificKey(this)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                  <span>копировать</span>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/** Рендеринг 60-key пакетов */
function renderChunks() {
  const grid = document.getElementById('chunks-grid');
  if (!grid) return;

  if (allChunks.length === 0) {
    grid.innerHTML = '<div class="card empty-card">Нет доступных пакетов ключей</div>';
    return;
  }

  grid.innerHTML = allChunks.map((chunk, idx) => {
    const partNum = chunk.part || idx + 1;
    const count = chunk.count || (chunk.keys ? chunk.keys.length : 0);
    const avgLatency = chunk.avg_latency || '—';
    const filePath = chunk.file || `chunks/part_${partNum}.txt`;

    const typesCount = {};
    (chunk.keys || []).forEach(k => {
      const d = parseVlessDetails(k);
      typesCount[d.security] = (typesCount[d.security] || 0) + 1;
    });
    const typesSummary = Object.entries(typesCount).map(([k, v]) => `${k}: ${v}`).join(' · ');

    return `
      <div class="chunk-card">
        <div class="chunk-header">
          <div class="chunk-title-group">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
              <span>Пакет #${partNum}</span>
              <span class="card-stats">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                ${count} ключей
              </span>
            </h3>
            <div class="chunk-meta">
              <span>Ср. задержка: <strong class="text-green">${avgLatency} мс</strong></span>
              ${typesSummary ? `<span>· ${typesSummary}</span>` : ''}
              <span>· Для Karing, Hiddify, v2rayTUN</span>
            </div>
          </div>
          <div class="chunk-actions">
            <button class="btn-chunk-copy" onclick="copyChunk(${idx}, this)">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>Скопировать ${count} ключей</span>
            </button>
            <a href="${filePath}" download="sck_part_${partNum}.txt" class="btn-chunk-download" title="Скачать файл пачки">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>
              </svg>
              <span>.txt</span>
            </a>
          </div>
        </div>

        <button class="chunk-preview-toggle" onclick="toggleChunkPreview(${partNum})">
          <span id="preview-lbl-${partNum}">Показать список серверов (${count})</span>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>
        <div class="chunk-preview-body" id="chunk-preview-${partNum}">
          ${(chunk.keys || []).map((k, kIdx) => {
            const det = parseVlessDetails(k);
            return `
              <div class="chunk-preview-item" title="${escapeHtml(k)}">
                <span class="preview-item-idx">${kIdx + 1}.</span>
                <span class="mini-pill">${det.security}</span>
                <span class="mini-pill">${det.type}</span>
                <span class="preview-item-host">${escapeHtml(det.host)}:${det.port}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }).join('');
}

function toggleChunkPreview(partNum) {
  const body = document.getElementById(`chunk-preview-${partNum}`);
  const lbl = document.getElementById(`preview-lbl-${partNum}`);
  if (body) {
    const isOpen = body.classList.toggle('open');
    if (lbl) {
      lbl.textContent = isOpen ? 'Скрыть список' : 'Показать список серверов';
    }
  }
}

function copyChunk(chunkIndex, btn) {
  const chunk = allChunks[chunkIndex];
  if (!chunk || !chunk.keys || !chunk.keys.length) return;

  const textToCopy = chunk.keys.join('\n');
  copyToClipboard(textToCopy, `Скопирован Пакет #${chunk.part} (${chunk.keys.length} ключей для Karing / Hiddify)`);

  if (btn) {
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Скопировано!</span>';
    setTimeout(() => { btn.innerHTML = origHtml; }, 1800);
  }
}

function copyKeyText(modeKey) {
  const textEl = document.getElementById('key-text-' + modeKey);
  const btn = document.getElementById('btn-copy-' + modeKey);
  if (!textEl) return;

  const key = textEl.textContent.trim();
  copyToClipboard(key, 'Ключ скопирован в буфер обмена');

  if (btn) {
    const origHtml = btn.innerHTML;
    btn.innerHTML = '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Скопировано!</span>';
    setTimeout(() => { btn.innerHTML = origHtml; }, 1800);
  }
}

function copySpecificKey(btn) {
  const key = btn.dataset.key;
  if (!key) return;

  copyToClipboard(key, 'Ключ скопирован в буфер обмена');
  const orig = btn.innerHTML;
  btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Скопировано!</span>';
  setTimeout(() => { btn.innerHTML = orig; }, 1500);
}

function copyToClipboard(text, successMsg) {
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg || 'Скопировано в буфер обмена');
    }).catch(() => {
      fallbackCopy(text, successMsg);
    });
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '0';
  ta.style.left = '0';
  ta.style.opacity = '0';
  document.body.appendChild(ta);
  ta.focus();
  ta.select();
  try {
    document.execCommand('copy');
    showToast(successMsg || 'Скопировано в буфер обмена');
  } catch (err) {
    showToast('Не удалось скопировать');
  }
  document.body.removeChild(ta);
}

function showToast(message) {
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  if (!toast) return;

  if (toastText) toastText.textContent = message;
  toast.classList.add('show');

  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove('show');
  }, 2200);
}

function setQuickFilter(type) {
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === type);
  });

  const searchInput = document.getElementById('search-input');
  if (type === 'all') {
    if (searchInput) searchInput.value = '';
    handleSearch('');
  } else if (type === 'fast') {
    if (searchInput) searchInput.value = '< 25 мс';
    searchQuery = 'fast';
    filterByMaxLatency(25);
  } else if (type === 'reality') {
    if (searchInput) searchInput.value = 'reality';
    handleSearch('reality');
  } else if (type === 'grpc') {
    if (searchInput) searchInput.value = 'grpc';
    handleSearch('grpc');
  }
}

function filterByMaxLatency(maxMs) {
  const clearBtn = document.getElementById('clear-search');
  if (clearBtn) clearBtn.style.display = 'block';

  document.querySelectorAll('.server-item').forEach(item => {
    const pingEl = item.querySelector('.server-ping');
    if (pingEl) {
      const ms = parseFloat(pingEl.textContent);
      item.style.display = (!isNaN(ms) && ms <= maxMs) ? 'flex' : 'none';
    }
  });
}

function handleSearch(val) {
  searchQuery = val.trim().toLowerCase();
  const clearBtn = document.getElementById('clear-search');
  if (clearBtn) {
    clearBtn.style.display = searchQuery ? 'block' : 'none';
  }

  document.querySelectorAll('.tab').forEach(tab => {
    const text = tab.textContent.toLowerCase();
    const matches = !searchQuery || text.includes(searchQuery);
    tab.style.display = matches ? 'inline-flex' : 'none';
  });

  document.querySelectorAll('.server-item').forEach(item => {
    const text = item.textContent.toLowerCase();
    const matches = !searchQuery || text.includes(searchQuery);
    item.style.display = matches ? 'flex' : 'none';
  });

  document.querySelectorAll('.chunk-card').forEach(card => {
    const text = card.textContent.toLowerCase();
    const matches = !searchQuery || text.includes(searchQuery);
    card.style.display = matches ? 'block' : 'none';
  });
}

function clearSearch() {
  const input = document.getElementById('search-input');
  if (input) {
    input.value = '';
    handleSearch('');
  }
  document.querySelectorAll('.filter-chip').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === 'all');
  });
}

function formatUptime(firstSeen) {
  try {
    const diff = Math.floor((Date.now() - new Date(firstSeen)) / 1000);
    if (isNaN(diff) || diff < 0) return 'недавно';
    if (diff < 3600) return Math.floor(diff / 60) + ' мин';
    if (diff < 86400) return Math.floor(diff / 3600) + ' ч';
    return Math.floor(diff / 86400) + ' д';
  } catch (e) {
    return 'недавно';
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

document.addEventListener('DOMContentLoaded', () => {
  loadData();
});
