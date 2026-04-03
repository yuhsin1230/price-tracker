'use strict';
window.Analysis = {
  calcUnitPrice(price, quantity, unitSize) {
    const total = Number(quantity) * Number(unitSize);
    return total > 0 ? Number(price) / total : 0;
  },

  // percentile = % of records cheaper than current → low = good buy
  calcPercentile(current, allPrices) {
    if (!allPrices || allPrices.length === 0) return null;
    const below = allPrices.filter(p => p < current - 0.00001).length;
    return Math.round((below / allPrices.length) * 100);
  },

  getRecommendation(pct) {
    if (pct === null || pct === undefined)
      return { level: 'unknown', label: '資料不足', color: '#8E8E93', emoji: '⚪', bg: 'rgba(142,142,147,.12)' };
    if (pct < 20) return { level: 'strong_buy', label: '強烈建議購買', color: '#34C759', emoji: '🟢', bg: 'rgba(52,199,89,.12)' };
    if (pct < 40) return { level: 'consider',   label: '可以考慮購買', color: '#FFCC00', emoji: '🟡', bg: 'rgba(255,204,0,.12)' };
    if (pct < 60) return { level: 'watch',       label: '觀望',         color: '#8E8E93', emoji: '⚪', bg: 'rgba(142,142,147,.12)' };
    if (pct < 80) return { level: 'wait',        label: '建議等待',     color: '#FF9500', emoji: '🟠', bg: 'rgba(255,149,0,.12)' };
    return            { level: 'avoid',       label: '不建議購買',   color: '#FF3B30', emoji: '🔴', bg: 'rgba(255,59,48,.12)' };
  },

  analyzeProduct(records) {
    if (!records || records.length === 0) return null;
    const ups = records.map(r => r.unitPrice);
    const min = Math.min(...ups), max = Math.max(...ups);
    const avg = ups.reduce((a, b) => a + b, 0) / ups.length;
    const minRec = records.find(r => Math.abs(r.unitPrice - min) < 0.00001);
    const latest = [...records].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    const pct = this.calcPercentile(latest.unitPrice, ups);
    return { minUnitPrice: min, maxUnitPrice: max, avgUnitPrice: avg,
             latestUnitPrice: latest.unitPrice, minRecord: minRec, latestRecord: latest,
             percentile: pct, recommendation: this.getRecommendation(pct), totalRecords: records.length };
  },

  compareUnitSizes(records, unitType) {
    const g = {};
    records.forEach(r => { if (!g[r.unitSize]) g[r.unitSize] = []; g[r.unitSize].push(r); });
    return Object.entries(g).map(([us, recs]) => {
      const ups = recs.map(r => r.unitPrice);
      const latest = [...recs].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      return { unitSize: +us, unitType, count: recs.length,
               minUnitPrice: Math.min(...ups), maxUnitPrice: Math.max(...ups),
               avgUnitPrice: ups.reduce((a,b)=>a+b,0)/ups.length, latestUnitPrice: latest.unitPrice };
    }).sort((a, b) => a.avgUnitPrice - b.avgUnitPrice);
  },

  compareStores(records, storesMap) {
    const g = {};
    records.forEach(r => { if (!g[r.storeId]) g[r.storeId] = []; g[r.storeId].push(r); });
    return Object.entries(g).map(([sid, recs]) => {
      const ups = recs.map(r => r.unitPrice);
      const latest = [...recs].sort((a, b) => new Date(b.date) - new Date(a.date))[0];
      return { storeId: sid, storeName: storesMap[sid]?.name || '未知', count: recs.length,
               minUnitPrice: Math.min(...ups), avgUnitPrice: ups.reduce((a,b)=>a+b,0)/ups.length,
               latestUnitPrice: latest.unitPrice, latestDate: latest.date };
    }).sort((a, b) => a.latestUnitPrice - b.latestUnitPrice);
  }
};
