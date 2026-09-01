(function(){
  'use strict';

  // Avoid double-injection: toggle instead of re-creating
  if(window.__chiccocoHype){
    const el = document.getElementById('chiccoco-hype-panel');
    if(el){ el.style.display = (el.style.display === 'none') ? 'flex' : 'none'; }
    return;
  }
  window.__chiccocoHype = true;

  const POLL_MS = 2500;
  const VELOCITY_WINDOW_MS = 120000; // 2 min rolling window for "sale velocity"

  // ---------- styles ----------
  const style = document.createElement('style');
  style.textContent = `
    #chiccoco-hype-panel{position:fixed;top:16px;right:16px;width:300px;max-height:82vh;
      background:#12131c;color:#f1efe9;border:1px solid #2a2f45;border-radius:16px;
      font-family:'Noto Sans Thai','Noto Sans',sans-serif;z-index:2147483647;
      box-shadow:0 12px 36px rgba(0,0,0,.5);display:flex;flex-direction:column;overflow:hidden;}
    #chiccoco-hype-head{cursor:move;background:#1b1e2c;padding:10px 12px;display:flex;
      align-items:center;justify-content:space-between;border-bottom:1px solid #2a2f45;user-select:none;}
    #chiccoco-hype-head b{font-size:12.5px;letter-spacing:.02em;}
    #chiccoco-hype-live{display:inline-block;width:8px;height:8px;border-radius:50%;
      background:#ff3f72;margin-right:6px;animation:chiccoco-pulse 1.2s infinite;}
    @keyframes chiccoco-pulse{0%,100%{opacity:1;}50%{opacity:.25;}}
    #chiccoco-hype-body{padding:12px;overflow-y:auto;flex:1;font-size:12.5px;}
    .chiccoco-hbtn{background:#232739;border:1px solid #2a2f45;color:#f1efe9;border-radius:8px;
      padding:3px 8px;font-size:11px;cursor:pointer;font-family:inherit;}
    .chiccoco-hbtn:hover{border-color:#ff3f72;}
    #chiccoco-hype-status{color:#8d92ab;font-size:11px;margin-bottom:10px;line-height:1.5;}
    .chiccoco-stat-row{display:flex;gap:8px;margin-bottom:10px;}
    .chiccoco-stat{flex:1;background:#181b27;border:1px solid #2a2f45;border-radius:10px;
      padding:9px;text-align:center;}
    .chiccoco-stat .n{font-family:'IBM Plex Mono',monospace;font-weight:700;font-size:19px;
      transition:transform .15s;}
    .chiccoco-stat .n.pop{transform:scale(1.28);color:#ff3f72;}
    .chiccoco-stat .l{font-size:9.5px;color:#8d92ab;margin-top:2px;}
    #chiccoco-hype-lead{margin-bottom:10px;}
    #chiccoco-hype-lead h4{font-size:10.5px;color:#8d92ab;text-transform:uppercase;
      letter-spacing:.05em;margin:0 0 6px;font-weight:700;}
    .chiccoco-lead-row{display:flex;justify-content:space-between;font-family:'IBM Plex Mono',monospace;
      font-size:12px;padding:4px 0;border-bottom:1px dashed #2a2f45;}
    .chiccoco-lead-row:last-child{border-bottom:none;}
    #chiccoco-hype-feed{display:flex;flex-direction:column-reverse;gap:6px;max-height:180px;overflow:hidden;}
    .chiccoco-feed-item{background:#181b27;border:1px solid #2a2f45;border-radius:8px;padding:6px 8px;
      font-size:11.5px;animation:chiccoco-slidein .25s ease-out;}
    .chiccoco-feed-item.soldout{border-color:#ff3f72;background:rgba(255,63,114,.12);font-weight:700;}
    @keyframes chiccoco-slidein{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}
    #chiccoco-hype-celebrate{position:fixed;inset:0;pointer-events:none;z-index:2147483646;
      display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s;}
    #chiccoco-hype-celebrate.show{opacity:1;}
    #chiccoco-hype-celebrate .msg{background:rgba(255,63,114,.95);color:#fff;font-weight:800;
      font-size:28px;padding:18px 32px;border-radius:20px;box-shadow:0 0 60px rgba(255,63,114,.7);
      transform:scale(.8);animation:chiccoco-pop .5s ease-out forwards;}
    @keyframes chiccoco-pop{0%{transform:scale(.6);}60%{transform:scale(1.12);}100%{transform:scale(1);}}
  `;
  document.head.appendChild(style);

  // ---------- panel ----------
  const panel = document.createElement('div');
  panel.id = 'chiccoco-hype-panel';
  panel.innerHTML = `
    <div id="chiccoco-hype-head">
      <b><span id="chiccoco-hype-live"></span>CHICCOCO LIVE MONITOR</b>
      <span>
        <button class="chiccoco-hbtn" id="chiccoco-hype-reset">รีเซ็ต</button>
        <button class="chiccoco-hbtn" id="chiccoco-hype-close">ปิด</button>
      </span>
    </div>
    <div id="chiccoco-hype-body">
      <div id="chiccoco-hype-status">กำลังค้นหาแถวสินค้า…</div>
      <div class="chiccoco-stat-row">
        <div class="chiccoco-stat"><div class="n" id="chiccoco-stat-sold">0</div><div class="l">ขายไปแล้ว (ชิ้น)</div></div>
        <div class="chiccoco-stat"><div class="n" id="chiccoco-stat-revenue">฿0</div><div class="l">ยอดขายประมาณ</div></div>
        <div class="chiccoco-stat"><div class="n" id="chiccoco-stat-velocity">0</div><div class="l">ชิ้น/นาที</div></div>
      </div>
      <div id="chiccoco-hype-lead">
        <h4>🔥 กำลังมาแรง</h4>
        <div id="chiccoco-hype-lead-list" style="color:#8d92ab;">ยังไม่มีข้อมูล</div>
      </div>
      <h4 style="font-size:10.5px;color:#8d92ab;text-transform:uppercase;letter-spacing:.05em;margin:0 0 6px;font-weight:700;">รายการล่าสุด</h4>
      <div id="chiccoco-hype-feed"></div>
    </div>
  `;
  document.body.appendChild(panel);

  const celebrateEl = document.createElement('div');
  celebrateEl.id = 'chiccoco-hype-celebrate';
  document.body.appendChild(celebrateEl);

  // ---------- drag ----------
  (function makeDraggable(){
    const head = document.getElementById('chiccoco-hype-head');
    let dragging = false, offX = 0, offY = 0;
    head.addEventListener('mousedown', e=>{
      dragging = true;
      const rect = panel.getBoundingClientRect();
      offX = e.clientX - rect.left; offY = e.clientY - rect.top;
      panel.style.right = 'auto';
    });
    document.addEventListener('mousemove', e=>{
      if(!dragging) return;
      panel.style.left = Math.max(0, e.clientX - offX) + 'px';
      panel.style.top = Math.max(0, e.clientY - offY) + 'px';
    });
    document.addEventListener('mouseup', ()=> dragging = false);
  })();

  document.getElementById('chiccoco-hype-close').onclick = ()=>{ panel.style.display = 'none'; };
  document.getElementById('chiccoco-hype-reset').onclick = ()=> resetCounters();

  // ---------- audio (WebAudio synth, no external files) ----------
  let audioCtx = null;
  function ensureAudio(){
    if(!audioCtx){
      try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){}
    }
    return audioCtx;
  }
  function ding(freq, dur){
    const ctx = ensureAudio();
    if(!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + dur + 0.05);
  }
  function saleSound(){ ding(880, 0.18); setTimeout(()=>ding(1320,0.18), 90); }
  function soldOutSound(){ [660,880,1100,1320].forEach((f,i)=> setTimeout(()=>ding(f,0.22), i*90)); }

  function celebrate(text){
    celebrateEl.innerHTML = '<div class="msg">'+text+'</div>';
    celebrateEl.classList.add('show');
    setTimeout(()=> celebrateEl.classList.remove('show'), 1400);
  }

  // ---------- state ----------
  let state = {}; // code -> {sold, remaining, price}
  let saleEvents = []; // {code, ts, qty}
  let totalSoldDelta = 0;
  let totalRevenueDelta = 0;
  let celebratedCodes = new Set(); // guards against re-celebrating the same code if remaining flaps

  function resetCounters(){
    state = {}; saleEvents = []; totalSoldDelta = 0; totalRevenueDelta = 0; celebratedCodes = new Set();
    document.getElementById('chiccoco-hype-feed').innerHTML = '';
    updateStatsUI();
  }

  function popNumber(id){
    const el = document.getElementById(id);
    el.classList.add('pop');
    setTimeout(()=> el.classList.remove('pop'), 220);
  }

  function addFeedItem(text, isSoldOut){
    const feed = document.getElementById('chiccoco-hype-feed');
    const item = document.createElement('div');
    item.className = 'chiccoco-feed-item' + (isSoldOut ? ' soldout' : '');
    item.textContent = text;
    feed.appendChild(item);
    while(feed.children.length > 12) feed.removeChild(feed.firstChild);
  }

  function updateStatsUI(){
    document.getElementById('chiccoco-stat-sold').textContent = totalSoldDelta;
    document.getElementById('chiccoco-stat-revenue').textContent = '฿' + totalRevenueDelta.toLocaleString('th-TH');
    const now = Date.now();
    const recent = saleEvents.filter(e => now - e.ts <= VELOCITY_WINDOW_MS);
    const recentQty = recent.reduce((a,e)=>a+e.qty, 0);
    const perMin = Math.round((recentQty / (VELOCITY_WINDOW_MS/60000)) * 10) / 10;
    document.getElementById('chiccoco-stat-velocity').textContent = perMin;

    // leaderboard: top codes by delta sold in this session
    const byCode = {};
    saleEvents.forEach(e=>{ byCode[e.code] = (byCode[e.code]||0) + e.qty; });
    const top = Object.entries(byCode).sort((a,b)=>b[1]-a[1]).slice(0,5);
    const leadList = document.getElementById('chiccoco-hype-lead-list');
    if(top.length===0){
      leadList.innerHTML = '<span style="color:#8d92ab;">ยังไม่มีข้อมูล</span>';
    } else {
      leadList.innerHTML = top.map(([code,qty])=>
        '<div class="chiccoco-lead-row"><span>'+code+'</span><span>+'+qty+'</span></div>'
      ).join('');
    }
  }

  // ---------- DOM reading ----------
  function extractRowsByDataAttr(){
    const items = document.querySelectorAll('li.monitor-item[data-code]');
    const rows = [];
    items.forEach(li=>{
      const code = (li.getAttribute('data-code')||'').trim();
      if(!code) return;
      const description = (li.getAttribute('data-description')||'').trim();
      const priceAttr = li.getAttribute('data-price');
      const price = priceAttr ? Math.round(parseFloat(priceAttr)) : null;
      const remainEl = li.querySelector('.remain');
      const remainText = remainEl ? (remainEl.textContent||'') : '';
      const m = remainText.match(/(\d+)\s*\/\s*(\d+)/);
      if(!m) return;
      rows.push({ code, description, sold: parseInt(m[1],10), remaining: parseInt(m[2],10), price });
    });
    return rows;
  }

  // fallback for pages where the data-attribute structure differs from what we expect
  function extractRowsByCheckboxFallback(){
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    const rows = [];
    const seen = new Set();
    for(const cb of checkboxes){
      let el = cb;
      let found = null;
      for(let i=0; i<10 && el; i++){
        el = el.parentElement;
        if(!el) break;
        const txt = el.innerText || '';
        if(/\d+\s*\/\s*\d+/.test(txt)){ found = el; break; }
      }
      if(!found) continue;
      const txt = found.innerText.trim();
      if(seen.has(txt)) continue;
      const codeMatch = txt.match(/^([A-Za-zก-๙]{1,3}\d{1,4})/);
      const ratioMatch = txt.match(/(\d+)\s*\/\s*(\d+)/);
      if(!codeMatch || !ratioMatch) continue;
      const textAfterCode = txt.slice(codeMatch[0].length);
      const numTokens = (textAfterCode.match(/\d+(?:,\d{3})*/g) || []).map(n=>parseInt(n.replace(/,/g,''),10));
      const price = numTokens.length ? numTokens[0] : null;
      seen.add(txt);
      rows.push({
        code: codeMatch[1],
        description: '',
        sold: parseInt(ratioMatch[1],10),
        remaining: parseInt(ratioMatch[2],10),
        price
      });
    }
    return rows;
  }

  // If the same product code appears more than once in the DOM at the same moment
  // (VRich re-rendering, a stale detached node not yet cleaned up, etc.), keep only
  // the entry with the HIGHER sold count — sold count only goes up during a live,
  // so the higher value is the accurate one and the lower one is stale. Without this,
  // a stale low-value duplicate can get processed after the real one and corrupt the
  // running total, making the next poll look like a huge burst of fake sales.
  function dedupeByCode(rows){
    const map = new Map();
    rows.forEach(r=>{
      const existing = map.get(r.code);
      if(!existing || r.sold > existing.sold){ map.set(r.code, r); }
    });
    return Array.from(map.values());
  }

  function extractRows(){
    let rows = [];
    try{ rows = extractRowsByDataAttr(); }catch(e){ console.error('chiccoco hype: data-attr extract error', e); }
    if(rows.length === 0){
      try{ rows = extractRowsByCheckboxFallback(); }catch(e){ console.error('chiccoco hype: fallback extract error', e); }
    }
    return dedupeByCode(rows);
  }

  function poll(){
    let rows = [];
    try{ rows = extractRows(); }catch(e){ console.error('chiccoco hype: extract error', e); }

    const statusEl = document.getElementById('chiccoco-hype-status');
    if(rows.length === 0){
      statusEl.textContent = '⚠️ หาแถวสินค้าไม่เจอ — ลองรีเฟรชหน้า หรือแจ้ง Claude พร้อมสกรีนช็อตหน้านี้';
      return;
    }
    statusEl.textContent = 'กำลังจับตา ' + rows.length + ' รายการสินค้า · อัปเดตทุก ' + (POLL_MS/1000) + ' วิ';

    rows.forEach(r=>{
      const prev = state[r.code];
      if(prev){
        const soldDelta = r.sold - prev.sold;
        if(soldDelta > 0){
          totalSoldDelta += soldDelta;
          if(r.price) totalRevenueDelta += soldDelta * r.price;
          saleEvents.push({code:r.code, ts:Date.now(), qty:soldDelta});
          popNumber('chiccoco-stat-sold');
          if(r.price) popNumber('chiccoco-stat-revenue');
          const justSoldOut = (r.remaining===0 && prev.remaining>0 && !celebratedCodes.has(r.code));
          const shortDesc = r.description ? (' ' + r.description.slice(0,22)) : '';
          addFeedItem((justSoldOut?'🎉 ':'🛒 ') + r.code + shortDesc + ' ขายเพิ่ม +' + soldDelta + ' (รวม ' + r.sold + ')' + (justSoldOut? ' — ขายหมดแล้ว!':''), justSoldOut);
          saleSound();
          if(justSoldOut){ celebrate('🎉 ' + r.code + ' ขายหมด!'); soldOutSound(); celebratedCodes.add(r.code); }
        }
      }
      state[r.code] = {sold:r.sold, remaining:r.remaining, price:r.price};
    });

    updateStatsUI();
  }

  // ---------- startup calibration ----------
  // VRich loads the sold/remaining numbers asynchronously after the page appears.
  // If we take our first snapshot too early we can catch stale/zero values, then the
  // next poll sees the real (already-large) numbers and misreads that jump as a sale.
  // So instead of trusting the very first read, we keep re-checking until two
  // consecutive checks agree, and only THEN start counting from that as the baseline.
  function snapshotKey(rows){
    return rows.map(r=> r.code+':'+r.sold+'/'+r.remaining).sort().join('|');
  }

  let calibrationTries = 0;
  const MAX_CALIBRATION_TRIES = 20; // ~16s worst case before giving up and starting anyway
  const MAX_EMPTY_TRIES = 6; // ~4.8s — a page with zero rows the whole time is a dead end, don't make them wait 16s to find out
  let emptyTries = 0;
  let lastCalibrationSnapshot = null;

  function calibrationStep(){
    let rows = [];
    try{ rows = extractRows(); }catch(e){ console.error('chiccoco hype: extract error', e); }
    const statusEl = document.getElementById('chiccoco-hype-status');
    calibrationTries++;

    if(rows.length === 0){
      emptyTries++;
      if(emptyTries >= MAX_EMPTY_TRIES){
        statusEl.textContent = '⚠️ หาแถวสินค้าไม่เจอ — ลองรีเฟรชหน้า หรือแจ้ง Claude พร้อมสกรีนช็อตหน้านี้';
        return;
      }
      statusEl.textContent = 'กำลังรอข้อมูลโหลด…';
      setTimeout(calibrationStep, 800);
      return;
    }
    emptyTries = 0;

    const key = snapshotKey(rows);
    const stable = (lastCalibrationSnapshot === key);
    lastCalibrationSnapshot = key;

    if(stable || calibrationTries >= MAX_CALIBRATION_TRIES){
      rows.forEach(r=>{ state[r.code] = {sold:r.sold, remaining:r.remaining, price:r.price}; });
      statusEl.textContent = 'พร้อมแล้ว กำลังจับตา ' + rows.length + ' รายการสินค้า · อัปเดตทุก ' + (POLL_MS/1000) + ' วิ';
      setInterval(poll, POLL_MS);
      return;
    }

    statusEl.textContent = 'กำลังรอข้อมูลนิ่ง… (' + calibrationTries + ')';
    setTimeout(calibrationStep, 800);
  }

  calibrationStep();
})();
