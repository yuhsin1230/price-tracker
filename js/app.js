'use strict';

// ═══════════════════════════════════════════
// State
// ═══════════════════════════════════════════
const S = {
  tab: 'home', view: 'home', productId: null,
  search: { home: '', products: '', stores: '' },
  cache: { products: [], stores: [], priceRecords: [], storesMap: {} }
};

// ═══════════════════════════════════════════
// Utils
// ═══════════════════════════════════════════
const uid = () => crypto.randomUUID();
const todayStr = () => new Date().toISOString().split('T')[0];
const esc = s => { const d = document.createElement('div'); d.appendChild(document.createTextNode(s||'')); return d.innerHTML; };
const fmtPrice = p => { const n = Number(p); return `$${Number.isInteger(n) ? n : n.toFixed(2)}`; };
const fmtUnit  = (p, t) => `$${Number(p).toFixed(4)} / ${t||''}`;
const fmtDate  = s => { const d = new Date(s + 'T00:00:00'); return `${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`; };
const $ = id => document.getElementById(id);

// ═══════════════════════════════════════════
// Toast
// ═══════════════════════════════════════════
function toast(msg, type='success') {
  const el = $('toast');
  el.textContent = msg; el.className = 'show';
  if (type === 'error') el.style.background = 'rgba(255,59,48,.92)';
  else el.style.background = '';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = '', 2200);
}

// ═══════════════════════════════════════════
// Cache
// ═══════════════════════════════════════════
async function reload() {
  const [products, stores, priceRecords] = await Promise.all([
    db.getAll('products'), db.getAll('stores'), db.getAll('priceRecords')
  ]);
  S.cache.products = products; S.cache.stores = stores; S.cache.priceRecords = priceRecords;
  S.cache.storesMap = Object.fromEntries(stores.map(s => [s.id, s]));
}

// ═══════════════════════════════════════════
// Router
// ═══════════════════════════════════════════
function nav(view, params = {}) {
  if (view === 'product-detail') {
    S.view = 'product-detail'; S.productId = params.id;
  } else {
    S.view = view; S.tab = view; S.productId = null;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === view));
  }
  window.scrollTo(0, 0); render();
}

function goBack() {
  S.view = S.tab; S.productId = null; window.scrollTo(0, 0); render();
}

function render() {
  switch (S.view) {
    case 'home':           renderHome(); break;
    case 'products':       renderProducts(); break;
    case 'product-detail': renderDetail(S.productId); break;
    case 'stores':         renderStores(); break;
    case 'settings':       renderSettings(); break;
  }
}

// ═══════════════════════════════════════════
// Header helpers
// ═══════════════════════════════════════════
function setHeader(html) { $('header').innerHTML = html; }

function backHeader(title, actions = '') {
  setHeader(`<div class="header-inner">
    <button class="header-back" data-action="back">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
      返回
    </button>
    <span class="header-title">${esc(title)}</span>
    <div style="display:flex;gap:6px">${actions}</div>
  </div>`);
}

// ═══════════════════════════════════════════
// HOME
// ═══════════════════════════════════════════
function renderHome() {
  const { products, priceRecords, storesMap } = S.cache;
  const active = products.filter(p => !p.isArchived);

  setHeader(`<div class="header-inner">
    <h1 class="header-title">比價達人</h1>
    <button class="btn-icon" data-action="add-price-home" aria-label="記錄價格">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
  </div>`);

  if (!active.length) {
    $('content').innerHTML = `<div class="empty-state fade-in">
      <div class="empty-icon">🛒</div><h2>尚無追蹤商品</h2>
      <p>前往「商品」頁面新增你要追蹤的商品，開始記錄價格。</p>
      <button class="btn-primary" style="width:auto;padding:12px 28px" data-action="go-products">前往商品管理</button>
    </div>`; return;
  }

  const q = (S.search.home || '').toLowerCase();
  const searchFilter = p => !q || p.name.toLowerCase().includes(q) || (p.brand||'').toLowerCase().includes(q);

  const items = active.filter(searchFilter).map(p => {
    const recs = priceRecords.filter(r => r.productId === p.id);
    return { p, a: Analysis.analyzeProduct(recs) };
  });

  const good = items.filter(({a}) => a && a.percentile < 40);
  const wait = items.filter(({a}) => !a || a.percentile >= 40);

  const card = ({p, a}) => {
    const rec = a ? a.recommendation : Analysis.getRecommendation(null);
    const store = a ? S.cache.storesMap[a.latestRecord?.storeId] : null;
    const pct = a ? a.percentile : 50;
    return `<div class="product-card fade-in" data-action="go-product" data-id="${p.id}">
      <div class="product-card-main">
        <div class="product-card-info">
          <div class="product-name">${esc(p.name)}${p.brand?`<span class="product-brand"> · ${esc(p.brand)}</span>`:''}</div>
          ${a ? `<div class="product-unit-price">
            <span class="unit-price-value">${fmtPrice(a.latestRecord.price)}</span>
            <span class="unit-price-store">(${fmtUnit(a.latestUnitPrice, p.unitType)})${store?' · '+esc(store.name):''}</span>
          </div>
          <span class="rec-badge" style="--rec-color:${rec.color};--rec-bg:${rec.bg}">${rec.emoji} ${rec.label}</span>`
          : `<div class="no-data-label">尚無紀錄</div>`}
        </div>
        ${a ? `<div class="product-card-percentile">
          <div class="percentile-ring" style="--pct:${pct};--rec-color:${rec.color}">
            <span class="percentile-value">${pct}%</span>
          </div>
        </div>`:``}
      </div>
    </div>`;
  };

  $('content').innerHTML = `
    <div class="search-wrap">
      <div class="search-input-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" type="search" placeholder="搜尋追蹤中的商品…" id="search-home" value="${esc(S.search.home)}">
      </div>
    </div>
    ${(q && items.length === 0) ? `<div class="empty-state" style="padding:40px 20px"><div class="empty-icon">🔍</div><h2>查無商品</h2><p>試試其他關鍵字</p></div>` : ''}
    ${good.length ? `<section class="home-section" style="padding-top:0">
      <div class="section-header"><h2 class="section-title">🟢 現在值得買</h2><span class="section-count">${good.length}</span></div>
      <div class="product-list">${good.map(card).join('')}</div>
    </section>`:''}
    ${wait.length ? `<section class="home-section" style="padding-top:${good.length?'12px':'0'}">
      <div class="section-header"><h2 class="section-title">🟠 再等等</h2><span class="section-count">${wait.length}</span></div>
      <div class="product-list">${wait.map(card).join('')}</div>
    </section>`:''}
  `;
  $('search-home')?.addEventListener('input', e => { S.search.home = e.target.value; renderHome(); });
}

// ═══════════════════════════════════════════
// PRODUCTS LIST
// ═══════════════════════════════════════════
function renderProducts() {
  setHeader(`<div class="header-inner">
    <h1 class="header-title">商品</h1>
    <button class="btn-icon" data-action="add-product" aria-label="新增商品">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
  </div>`);

  const q = S.search.products.toLowerCase();
  const active = S.cache.products.filter(p => !p.isArchived && (
    !q || p.name.toLowerCase().includes(q) || (p.brand||'').toLowerCase().includes(q) || (p.category||'').toLowerCase().includes(q)
  ));

  const groups = {};
  active.forEach(p => {
    const k = p.category || '其他'; if (!groups[k]) groups[k] = []; groups[k].push(p);
  });

  const recBadge = (p) => {
    const recs = S.cache.priceRecords.filter(r => r.productId === p.id);
    const a = Analysis.analyzeProduct(recs);
    if (!a) return `<span class="tag">無紀錄</span>`;
    const R = a.recommendation;
    return `<span class="rec-badge" style="--rec-color:${R.color};--rec-bg:${R.bg};font-size:.7rem;margin:0">${R.emoji} ${a.percentile}%</span>`;
  };

  const listHTML = Object.entries(groups).map(([cat, ps]) => `
    <div class="list-section">
      <div class="list-section-title">${esc(cat)}</div>
      <div class="list-group">${ps.map(p => `
        <div class="list-item" data-action="go-product" data-id="${p.id}">
          <div class="list-item-icon" style="background:var(--accent-bg);color:var(--accent)">${(p.name[0]||'?').toUpperCase()}</div>
          <div class="list-item-body">
            <div class="list-item-title">${esc(p.name)}${p.brand?` <span style="font-weight:400;color:var(--txt3)">${esc(p.brand)}</span>`:''}</div>
            <div class="list-item-sub">${esc(p.unitType)} · ${S.cache.priceRecords.filter(r=>r.productId===p.id).length} 筆紀錄</div>
          </div>
          <div class="list-item-right">${recBadge(p)}<svg class="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
        </div>`).join('')}
      </div>
    </div>`).join('');

  $('content').innerHTML = `
    <div class="search-wrap">
      <div class="search-input-wrap">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input class="search-input" type="search" placeholder="搜尋商品…" id="search-products" value="${esc(S.search.products)}">
      </div>
    </div>
    ${active.length ? listHTML : `<div class="empty-state"><div class="empty-icon">📦</div><h2>${S.search.products?'查無結果':'尚無商品'}</h2><p>${S.search.products?'試試其他關鍵字':'點右上角 + 新增第一個商品'}</p></div>`}
  `;
  $('search-products')?.addEventListener('input', e => { S.search.products = e.target.value; renderProducts(); });
}

// ═══════════════════════════════════════════
// PRODUCT DETAIL
// ═══════════════════════════════════════════
function renderDetail(id) {
  const p = S.cache.products.find(x => x.id === id);
  if (!p) { goBack(); return; }

  const recs = S.cache.priceRecords.filter(r => r.productId === id)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const a = Analysis.analyzeProduct(recs);
  const R = a ? a.recommendation : Analysis.getRecommendation(null);

  backHeader(p.name,
    `<button class="btn-ghost" data-action="add-price" data-id="${id}">+ 記錄</button>
     <button class="btn-icon" data-action="edit-product" data-id="${id}" aria-label="編輯">
       <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
     </button>`
  );

  // Analysis card
  let analysisHTML = `<div class="analysis-card">
    <div class="analysis-card-title">價格分析</div>`;

  if (a) {
    const pct = a.percentile;
    const barColor = pct < 40 ? 'var(--green)' : pct < 60 ? 'var(--txt3)' : pct < 80 ? 'var(--orange)' : 'var(--red)';
    analysisHTML += `
      <div class="analysis-hero">
        <div>
          <div class="analysis-main-price">${fmtPrice(a.latestRecord.price)}</div>
          <div class="analysis-unit">最新售價 (${fmtUnit(a.latestUnitPrice, p.unitType)})</div>
        </div>
        <div class="rec-chip" style="background:${R.bg};color:${R.color}">${R.emoji} ${R.label}</div>
      </div>
      <div class="analysis-stats">
        <div class="stat-item"><div class="stat-label">歷史最低</div><div class="stat-value is-min">${fmtUnit(a.minUnitPrice, p.unitType)}</div></div>
        <div class="stat-item"><div class="stat-label">歷史平均</div><div class="stat-value">${fmtUnit(a.avgUnitPrice, p.unitType)}</div></div>
        <div class="stat-item"><div class="stat-label">歷史最高</div><div class="stat-value">${fmtUnit(a.maxUnitPrice, p.unitType)}</div></div>
      </div>
      <div class="pct-bar-wrap">
        <div class="pct-bar-labels"><span>🟢 低價</span><span>百分位 ${pct}%</span><span>高價 🔴</span></div>
        <div class="pct-bar-track">
          <div class="pct-bar-fill" style="width:${pct}%;background:${barColor}"></div>
          <div class="pct-bar-thumb" style="--pct:${pct};border-color:${barColor}"></div>
        </div>
      </div>
      <div style="margin-top:10px;font-size:.75rem;color:var(--txt3)">共 ${a.totalRecords} 筆紀錄 · 最低價出現於 ${fmtDate(a.minRecord.date)} ${esc(S.cache.storesMap[a.minRecord.storeId]?.name||'')}</div>`;
  } else {
    analysisHTML += `<div class="empty-state" style="padding:24px 0"><div class="empty-icon" style="font-size:2rem">📊</div><p>新增幾筆紀錄後，即可查看價格分析</p></div>`;
  }
  analysisHTML += `</div>`;

  // Cross-store compare
  let storeCompareHTML = '';
  if (a && recs.length > 0) {
    const storeGroups = Analysis.compareStores(recs, S.cache.storesMap);
    if (storeGroups.length > 1) {
      storeCompareHTML = `<div class="analysis-card">
        <div class="analysis-card-title">跨賣場比較</div>
        <table class="compare-table">
          <thead><tr><th>賣場</th><th>最新</th><th>最低</th><th style="text-align:right">筆數</th></tr></thead>
          <tbody>${storeGroups.map((s, i) => `
            <tr class="${i===0?'is-best':''}">
              <td>${esc(s.storeName)}</td>
              <td>${fmtUnit(s.latestUnitPrice, p.unitType)}</td>
              <td>${fmtUnit(s.minUnitPrice, p.unitType)}</td>
              <td style="text-align:right">${s.count}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }
  }

  // Unit size compare
  let sizeCompareHTML = '';
  if (recs.length > 0) {
    const sizes = Analysis.compareUnitSizes(recs, p.unitType);
    if (sizes.length > 1) {
      sizeCompareHTML = `<div class="analysis-card">
        <div class="analysis-card-title">規格比較（哪種划算？）</div>
        <table class="compare-table">
          <thead><tr><th>規格</th><th>平均單價</th><th>最低單價</th></tr></thead>
          <tbody>${sizes.map((s, i) => `
            <tr class="${i===0?'is-best':''}">
              <td>${s.unitSize}${esc(p.unitType)}${i===0?` <span class="best-badge">👑 最划算</span>`:''}</td>
              <td>${fmtUnit(s.avgUnitPrice, p.unitType)}</td>
              <td>${fmtUnit(s.minUnitPrice, p.unitType)}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
    }
  }

  // Price records
  const recListHTML = recs.length ? `<div class="analysis-card" style="padding:0">
    <div style="padding:14px 16px 0"><div class="analysis-card-title">價格記錄</div></div>
    ${recs.map(r => {
      const store = S.cache.storesMap[r.storeId];
      return `<div class="price-record-item">
        <div class="price-record-left">
          <div class="pri-main">${fmtPrice(r.price)} × ${r.quantity} × ${r.unitSize}${esc(p.unitType)}${r.isPromotion?`<span class="pri-badge">促銷</span>`:''}</div>
          <div class="pri-sub">
            <span>${store?esc(store.name):'未知賣場'}</span>
            <span>共 ${r.totalSize}${esc(p.unitType)}</span>
            ${r.note?`<span>${esc(r.note)}</span>`:''}
          </div>
        </div>
        <div class="price-record-right">
          <div class="pri-unit">${fmtUnit(r.unitPrice, p.unitType)}</div>
          <div class="pri-date">${fmtDate(r.date)}</div>
          <div class="pri-actions">
            <button class="btn-ghost" style="font-size:.75rem" data-action="edit-price" data-id="${r.id}">編輯</button>
            <button class="btn-ghost btn-danger" style="font-size:.75rem" data-action="delete-price" data-id="${r.id}">刪除</button>
          </div>
        </div>
      </div>`;
    }).join('')}
  </div>` : '';

  $('content').innerHTML = `<div class="detail-wrap fade-in">
    ${analysisHTML}${storeCompareHTML}${sizeCompareHTML}${recListHTML}
    <div style="margin-top:20px;text-align:center">
      <button class="btn-ghost btn-danger" style="padding:10px 20px" data-action="archive-product" data-id="${id}">刪除此商品</button>
    </div>
    <div style="height:20px"></div>
  </div>`;
}

// ═══════════════════════════════════════════
// STORES
// ═══════════════════════════════════════════
function renderStores() {
  setHeader(`<div class="header-inner">
    <h1 class="header-title">賣場</h1>
    <button class="btn-icon" data-action="add-store" aria-label="新增賣場">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>
  </div>`);

  const active = S.cache.stores.filter(s => !s.isArchived);

  $('content').innerHTML = `
    <div class="list-section">
      <div class="list-group">${active.length ? active.map(s => {
        const cnt = S.cache.priceRecords.filter(r => r.storeId === s.id).length;
        return `<div class="list-item">
          <div class="list-item-icon" style="background:rgba(52,199,89,.1);color:var(--green)">🏪</div>
          <div class="list-item-body">
            <div class="list-item-title">${esc(s.name)}</div>
            <div class="list-item-sub">${s.location?esc(s.location)+' · ':''}${cnt} 筆紀錄</div>
          </div>
          <div class="list-item-right">
            <button class="btn-ghost" style="font-size:.82rem" data-action="edit-store" data-id="${s.id}">編輯</button>
            <button class="btn-ghost btn-danger" style="font-size:.82rem" data-action="archive-store" data-id="${s.id}">封存</button>
          </div>
        </div>`;
      }).join('') : `<div class="empty-state" style="padding:40px 20px"><div class="empty-icon">🏪</div><p>點右上角 + 新增賣場</p></div>`}
      </div>
    </div>`;
}

// ═══════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════
function renderSettings() {
  setHeader(`<div class="header-inner"><h1 class="header-title">設定</h1></div>`);

  const archProds = S.cache.products.filter(p => p.isArchived);
  const archStores = S.cache.stores.filter(s => s.isArchived);

  const prodHTML = archProds.length ? `<div class="list-group">${archProds.map(p => `
    <div class="archived-item">
      <div><div class="archived-name">${esc(p.name)}</div><div class="archived-meta">${esc(p.brand||'')} · ${esc(p.unitType)}</div></div>
      <div style="display:flex;gap:12px">
        <button class="btn-ghost" data-action="restore-product" data-id="${p.id}">還原</button>
        <button class="btn-ghost btn-danger" data-action="hard-delete-product" data-id="${p.id}">永久刪除</button>
      </div>
    </div>`).join('')}</div>` : `<div style="padding:12px 4px;color:var(--txt3);font-size:.85rem">無已刪除商品</div>`;

  const storeHTML = archStores.length ? `<div class="list-group">${archStores.map(s => `
    <div class="archived-item">
      <div><div class="archived-name">${esc(s.name)}</div><div class="archived-meta">${esc(s.location||'')}</div></div>
      <div style="display:flex;gap:12px">
        <button class="btn-ghost" data-action="restore-store" data-id="${s.id}">還原</button>
        <button class="btn-ghost btn-danger" data-action="hard-delete-store" data-id="${s.id}">永久刪除</button>
      </div>
    </div>`).join('')}</div>` : `<div style="padding:12px 4px;color:var(--txt3);font-size:.85rem">無已刪除賣場</div>`;

  $('content').innerHTML = `
    <div class="settings-section">
      <div class="settings-section-title" style="display:flex;justify-content:space-between;align-items:center;">
        <span>已刪除商品</span>
        ${archProds.length ? `<button class="btn-ghost btn-danger" style="margin:0;padding:0;font-size:.72rem" data-action="hard-delete-all-products">清空全部</button>` : ''}
      </div>${prodHTML}
    </div>
    <div class="settings-section">
      <div class="settings-section-title" style="display:flex;justify-content:space-between;align-items:center;">
        <span>已刪除賣場</span>
        ${archStores.length ? `<button class="btn-ghost btn-danger" style="margin:0;padding:0;font-size:.72rem" data-action="hard-delete-all-stores">清空全部</button>` : ''}
      </div>${storeHTML}
    </div>
    <div class="settings-section">
      <div class="settings-section-title">關於</div>
      <div class="list-group">
        <div class="list-item" style="cursor:default">
          <div class="list-item-body"><div class="list-item-title">版本</div><div class="list-item-sub">1.0.0 MVP</div></div>
        </div>
        <div class="list-item" style="cursor:default">
          <div class="list-item-body"><div class="list-item-title">儲存方式</div><div class="list-item-sub">本地 IndexedDB（完全離線）</div></div>
        </div>
      </div>
    </div>`;
}

// ═══════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════
function showModal(html) {
  const bd = $('modal-backdrop'), sh = $('modal-sheet');
  sh.innerHTML = html; bd.classList.remove('hidden'); sh.classList.remove('hidden');
  requestAnimationFrame(() => requestAnimationFrame(() => {
    bd.classList.add('visible'); sh.classList.add('visible');
  }));
}

function closeModal() {
  const bd = $('modal-backdrop'), sh = $('modal-sheet');
  bd.classList.remove('visible'); sh.classList.remove('visible');
  setTimeout(() => { bd.classList.add('hidden'); sh.classList.add('hidden'); sh.innerHTML = ''; }, 340);
}

function customConfirm(msg) {
  return new Promise(res => {
    showModal(`
      <div class="sheet-handle"></div>
      <div class="sheet-body" style="padding:30px 20px;text-align:center">
        <h3 style="margin-bottom:24px;font-size:1.05rem">${esc(msg)}</h3>
        <div style="display:flex;gap:12px">
          <button class="btn-primary" style="background:var(--bg3);color:var(--txt)" id="btn-cc-no">取消</button>
          <button class="btn-primary" style="background:var(--red)" id="btn-cc-yes">確定</button>
        </div>
      </div>`);
    $('btn-cc-no').onclick = () => { closeModal(); res(false); };
    $('btn-cc-yes').onclick = () => { closeModal(); res(true); };
  });
}

// ═══════════════════════════════════════════
// MODAL: Product
// ═══════════════════════════════════════════
function showProductModal(id = null) {
  const p = id ? S.cache.products.find(x => x.id === id) : null;
  const title = p ? '編輯商品' : '新增商品';
  const cats = [...new Set(S.cache.products.filter(x=>!x.isArchived&&x.category).map(x=>x.category))];
  showModal(`
    <div class="sheet-handle"></div>
    <div class="sheet-header"><span class="sheet-title">${title}</span><button class="btn-ghost" data-action="close-modal">關閉</button></div>
    <div class="sheet-body">
      <form id="product-form">
        <div class="form-group"><label class="form-label">商品名稱 *</label><input class="form-input" name="name" required placeholder="例：統一LP33保健食品" value="${esc(p?.name||'')}"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">品牌</label><input class="form-input" name="brand" placeholder="例：統一" value="${esc(p?.brand||'')}"></div>
          <div class="form-group"><label class="form-label">分類</label><input class="form-input" name="category" placeholder="食品" list="cat-list" value="${esc(p?.category||'')}"><datalist id="cat-list">${cats.map(c=>`<option value="${esc(c)}">`).join('')}</datalist></div>
        </div>
        <div class="form-group"><label class="form-label">計量單位 *</label>
          <select class="form-input form-select" name="unitType" required>
            ${['ml','L','g','kg','count','片','包','盒','瓶','罐'].map(u=>`<option value="${u}" ${p?.unitType===u?'selected':''}>${u}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">條碼（選填）</label><input class="form-input" name="barcode" placeholder="掃描或手動輸入" value="${esc(p?.barcode||'')}"></div>
        <button type="submit" class="btn-primary">${p ? '儲存變更' : '新增商品'}</button>
        ${p ? `<div style="margin-top:10px;text-align:center"><button type="button" class="btn-ghost btn-danger" data-action="archive-product" data-id="${p.id}">刪除商品</button></div>` : ''}
      </form>
    </div>`);
  $('product-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const now = new Date().toISOString();
    // Duplicate check (name+brand)
    const dup = S.cache.products.find(x => !x.isArchived && x.id !== id &&
      x.name.trim().toLowerCase() === fd.get('name').trim().toLowerCase() &&
      (x.brand||'').trim().toLowerCase() === (fd.get('brand')||'').trim().toLowerCase());
    if (dup) { toast('相同商品已存在', 'error'); return; }
    if (p) {
      await db.put('products', { ...p, name:fd.get('name'), brand:fd.get('brand'), category:fd.get('category'), unitType:fd.get('unitType'), barcode:fd.get('barcode'), updatedAt:now });
    } else {
      await db.add('products', { id:uid(), name:fd.get('name'), brand:fd.get('brand'), category:fd.get('category'), unitType:fd.get('unitType'), barcode:fd.get('barcode'), isArchived:false, createdAt:now, updatedAt:now });
    }
    await reload(); closeModal(); toast(p?'商品已更新':'商品已新增');
    setTimeout(render, 350);
  });
}

// ═══════════════════════════════════════════
// MODAL: Store
// ═══════════════════════════════════════════
function showStoreModal(id = null) {
  const s = id ? S.cache.stores.find(x => x.id === id) : null;
  showModal(`
    <div class="sheet-handle"></div>
    <div class="sheet-header"><span class="sheet-title">${s?'編輯賣場':'新增賣場'}</span><button class="btn-ghost" data-action="close-modal">關閉</button></div>
    <div class="sheet-body">
      <form id="store-form">
        <div class="form-group"><label class="form-label">賣場名稱 *</label><input class="form-input" name="name" required placeholder="例：全聯、家樂福" value="${esc(s?.name||'')}"></div>
        <div class="form-group"><label class="form-label">地點（選填）</label><input class="form-input" name="location" placeholder="例：忠孝店" value="${esc(s?.location||'')}"></div>
        <div class="form-group"><label class="form-label">備註（選填）</label><input class="form-input" name="note" placeholder="" value="${esc(s?.note||'')}"></div>
        <button type="submit" class="btn-primary">${s?'儲存變更':'新增賣場'}</button>
      </form>
    </div>`);
  $('store-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target); const now = new Date().toISOString();
    if (s) {
      await db.put('stores', { ...s, name:fd.get('name'), location:fd.get('location'), note:fd.get('note'), updatedAt:now });
    } else {
      await db.add('stores', { id:uid(), name:fd.get('name'), location:fd.get('location'), note:fd.get('note'), isArchived:false, createdAt:now, updatedAt:now });
    }
    await reload(); closeModal(); toast(s?'賣場已更新':'賣場已新增'); setTimeout(render, 350);
  });
}

// ═══════════════════════════════════════════
// MODAL: Price Record
// ═══════════════════════════════════════════
function showPriceModal(productId = null, recordId = null) {
  const activeProds = S.cache.products.filter(p => !p.isArchived);
  const activeStores = S.cache.stores.filter(s => !s.isArchived);
  const rec = recordId ? S.cache.priceRecords.find(r => r.id === recordId) : null;

  // Smart defaults
  let defProductId = productId || rec?.productId || activeProds[0]?.id || '';
  let defStoreId = rec?.storeId || '';
  // Last used store for this product
  if (!defStoreId && defProductId) {
    const last = S.cache.priceRecords.filter(r => r.productId === defProductId).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    defStoreId = last?.storeId || '';
  }
  // Last unitSize for this product
  let defUnitSize = rec?.unitSize || '';
  if (!defUnitSize && defProductId) {
    const last = S.cache.priceRecords.filter(r => r.productId === defProductId).sort((a,b)=>new Date(b.date)-new Date(a.date))[0];
    defUnitSize = last?.unitSize || '';
  }

  const getUnitType = (pid) => S.cache.products.find(x=>x.id===pid)?.unitType || '';

  showModal(`
    <div class="sheet-handle"></div>
    <div class="sheet-header"><span class="sheet-title">${rec?'編輯紀錄':'記錄價格'}</span><button class="btn-ghost" data-action="close-modal">關閉</button></div>
    <div class="sheet-body">
      <form id="price-form">
        <div class="form-group"><label class="form-label">商品 *</label>
          <select class="form-input form-select" name="productId" id="pf-product" required>
            ${activeProds.map(p=>`<option value="${p.id}" ${p.id===defProductId?'selected':''}>${esc(p.name)}${p.brand?' - '+esc(p.brand):''}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">賣場 *</label>
          <select class="form-input form-select" name="storeId" required>
            ${activeStores.map(s=>`<option value="${s.id}" ${s.id===defStoreId?'selected':''}>${esc(s.name)}${s.location?' - '+esc(s.location):''}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">售價 (元) *</label><input class="form-input" type="number" name="price" step="any" min="0.01" required placeholder="0.00" value="${rec?.price||''}"></div>
        <div class="form-row">
          <div class="form-group"><label class="form-label">數量 *</label><input class="form-input" type="number" name="quantity" min="1" step="1" required value="${rec?.quantity||1}" id="pf-qty"></div>
          <div class="form-group"><label class="form-label">規格 (<span id="pf-unit-label">${getUnitType(defProductId)}</span>) *</label><input class="form-input" type="number" name="unitSize" step="any" min="0.01" required placeholder="例: 600" value="${defUnitSize||''}" id="pf-size"></div>
        </div>
        <div id="pf-calc" class="form-calc-display" style="margin-bottom:16px">
          <span class="form-calc-label">計算單位價格</span>
          <span class="form-calc-value" id="pf-calc-val">—</span>
        </div>
        <div class="form-group"><label class="form-label">日期 *</label><input class="form-input" type="date" name="date" required value="${rec?.date||todayStr()}"></div>
        <div class="form-group"><label class="form-checkbox-row"><input type="checkbox" name="isPromotion" ${rec?.isPromotion?'checked':''}><span class="form-checkbox-label">🏷 促銷價</span></label></div>
        <div class="form-group"><label class="form-label">備註（選填）</label><input class="form-input" name="note" placeholder="例：週年慶特價" value="${esc(rec?.note||'')}"></div>
        <button type="submit" class="btn-primary">${rec?'儲存變更':'新增紀錄'}</button>
      </form>
    </div>`);

  // Live calc
  const updateCalc = () => {
    const pid = $('pf-product')?.value;
    const ut = getUnitType(pid);
    const unitLabel = document.getElementById('pf-unit-label');
    if (unitLabel) unitLabel.textContent = ut;
    const price = parseFloat($('price-form').price?.value) || 0;
    const qty   = parseFloat($('pf-qty')?.value) || 1;
    const size  = parseFloat($('pf-size')?.value) || 0;
    const up = Analysis.calcUnitPrice(price, qty, size);
    const el = $('pf-calc-val');
    if (el) el.textContent = size > 0 ? fmtUnit(up, ut) : '—';
  };

  $('price-form').addEventListener('input', updateCalc);
  updateCalc();

  $('price-form').addEventListener('submit', async e => {
    e.preventDefault();
    const fd = new FormData(e.target); const now = new Date().toISOString();
    const price    = parseFloat(fd.get('price'));
    const quantity = parseInt(fd.get('quantity'));
    const unitSize = parseFloat(fd.get('unitSize'));
    if (!fd.get('productId') || !fd.get('storeId') || !price || !unitSize) {
      toast('請填寫所有必填欄位', 'error'); return;
    }
    const totalSize = quantity * unitSize;
    const unitPrice = Analysis.calcUnitPrice(price, quantity, unitSize);
    const data = {
      productId: fd.get('productId'), storeId: fd.get('storeId'),
      price, quantity, unitSize, totalSize, unitPrice,
      isPromotion: fd.has('isPromotion') && fd.get('isPromotion') === 'on',
      date: fd.get('date'), note: fd.get('note'), createdAt: now
    };
    if (rec) {
      await db.put('priceRecords', { ...rec, ...data });
    } else {
      await db.add('priceRecords', { id: uid(), ...data });
    }
    await reload(); closeModal(); toast(rec?'紀錄已更新':'已記錄價格！');
    setTimeout(render, 350);
  });
}

// ═══════════════════════════════════════════
// Actions
// ═══════════════════════════════════════════
async function archiveProduct(id) {
  if (!(await customConfirm('確定要刪除此商品嗎？歷史紀錄將保留且可從「設定」中還原。'))) return;
  const p = S.cache.products.find(x => x.id === id);
  if (!p) return;
  await db.put('products', { ...p, isArchived: true, updatedAt: new Date().toISOString() });
  await reload(); closeModal(); toast('商品已刪除'); setTimeout(() => { S.view = S.tab; render(); }, 350);
}

async function archiveStore(id) {
  if (!(await customConfirm('確定要封存此賣場嗎？歷史紀錄將保留。'))) return;
  const s = S.cache.stores.find(x => x.id === id);
  if (!s) return;
  await db.put('stores', { ...s, isArchived: true, updatedAt: new Date().toISOString() });
  await reload(); toast('賣場已封存'); setTimeout(render, 350);
}

async function restoreProduct(id) {
  const p = S.cache.products.find(x => x.id === id);
  if (!p) return;
  await db.put('products', { ...p, isArchived: false, updatedAt: new Date().toISOString() });
  await reload(); toast('商品已還原'); setTimeout(render, 50);
}

async function restoreStore(id) {
  const s = S.cache.stores.find(x => x.id === id);
  if (!s) return;
  await db.put('stores', { ...s, isArchived: false, updatedAt: new Date().toISOString() });
  await reload(); toast('賣場已還原'); setTimeout(render, 50);
}

async function deletePriceRecord(id) {
  if (!(await customConfirm('確定要刪除此紀錄嗎？'))) return;
  await db.delete('priceRecords', id);
  await reload(); toast('紀錄已刪除'); setTimeout(() => renderDetail(S.productId), 50);
}

async function hardDeleteProduct(id) {
  if (!(await customConfirm('確定要永久刪除此商品嗎？所有相關的價格紀錄也會一併刪除且無法還原。'))) return;
  const recs = S.cache.priceRecords.filter(r => r.productId === id);
  for(let r of recs) await db.delete('priceRecords', r.id);
  await db.delete('products', id);
  await reload(); toast('商品已永久刪除'); setTimeout(render, 50);
}

async function hardDeleteStore(id) {
  if (!(await customConfirm('確定要永久刪除此賣場嗎？所有相關的價格紀錄也會一併刪除且無法還原。'))) return;
  const recs = S.cache.priceRecords.filter(r => r.storeId === id);
  for(let r of recs) await db.delete('priceRecords', r.id);
  await db.delete('stores', id);
  await reload(); toast('賣場已永久刪除'); setTimeout(render, 50);
}

async function hardDeleteAllProducts() {
  if (!(await customConfirm('確定要清空所有已刪除的商品嗎？此動作無法還原。'))) return;
  const archProds = S.cache.products.filter(p => p.isArchived);
  for(let p of archProds) {
    const recs = S.cache.priceRecords.filter(r => r.productId === p.id);
    for(let r of recs) await db.delete('priceRecords', r.id);
    await db.delete('products', p.id);
  }
  await reload(); toast('已清空刪除的商品'); setTimeout(render, 50);
}

async function hardDeleteAllStores() {
  if (!(await customConfirm('確定要清空所有已刪除的賣場嗎？此動作無法還原。'))) return;
  const archStores = S.cache.stores.filter(s => s.isArchived);
  for(let s of archStores) {
    const recs = S.cache.priceRecords.filter(r => r.storeId === s.id);
    for(let r of recs) await db.delete('priceRecords', r.id);
    await db.delete('stores', s.id);
  }
  await reload(); toast('已清空刪除的賣場'); setTimeout(render, 50);
}

// ═══════════════════════════════════════════
// Event delegation
// ═══════════════════════════════════════════
document.addEventListener('click', e => {
  const el = e.target.closest('[data-action]');
  if (!el) return;
  const action = el.dataset.action;
  const id = el.dataset.id;
  switch (action) {
    case 'back':             goBack(); break;
    case 'close-modal':      closeModal(); break;
    case 'go-product':       nav('product-detail', { id }); break;
    case 'go-products':      nav('products'); break;
    case 'add-product':      showProductModal(); break;
    case 'edit-product':     showProductModal(id); break;
    case 'archive-product':  archiveProduct(id); break;
    case 'restore-product':  restoreProduct(id); break;
    case 'add-store':        showStoreModal(); break;
    case 'edit-store':       showStoreModal(id); break;
    case 'archive-store':    archiveStore(id); break;
    case 'restore-store':    restoreStore(id); break;
    case 'add-price':        showPriceModal(id || S.productId); break;
    case 'add-price-home':   showPriceModal(); break;
    case 'edit-price':       showPriceModal(S.productId, id); break;
    case 'delete-price':             deletePriceRecord(id); break;
    case 'hard-delete-product':      hardDeleteProduct(id); break;
    case 'hard-delete-store':        hardDeleteStore(id); break;
    case 'hard-delete-all-products': hardDeleteAllProducts(); break;
    case 'hard-delete-all-stores':   hardDeleteAllStores(); break;
  }
});

$('tab-bar').addEventListener('click', e => {
  const btn = e.target.closest('.tab-btn');
  if (btn) nav(btn.dataset.tab);
});

$('modal-backdrop').addEventListener('click', closeModal);

// ═══════════════════════════════════════════
// Init
// ═══════════════════════════════════════════
async function init() {
  await db.init();
  await reload();
  render();
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }
}

document.addEventListener('DOMContentLoaded', init);
