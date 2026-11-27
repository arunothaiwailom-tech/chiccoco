/* CHICCOCO — แผงสคริปต์ไลฟ์ (ไฟล์เสริม ไม่แก้โค้ดเดิมของ chiccoco-remote.html)
   - อ่านค่า db / shopPath / currentCode / products ของหน้าเดิมแบบอ่านอย่างเดียว
   - เก็บสคริปต์ใน Firebase: <shopPath>/scripts/<รหัส>
   - ยิงรหัสจากเครื่องไหนก็ได้ แผงบนทุกเครื่องเปลี่ยนตาม (ใช้ currentCode ที่ซิงค์อยู่แล้ว) */
(function(){
  if(window.__ccScriptPanel) return;
  window.__ccScriptPanel = true;

  var LS = {
    get: function(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } },
    set: function(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
  };
  function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function up(s){ return String(s==null?'':s).trim().toUpperCase(); }

  /* อ่านตัวแปรของหน้าเดิม (ประกาศด้วย let ในหน้า) แบบปลอดภัย */
  function getDb(){ try{ return db; }catch(e){ return null; } }
  function getPath(){ try{ return shopPath; }catch(e){ return null; } }
  function getCode(){ try{ return currentCode; }catch(e){ return null; } }
  function getConn(){ try{ return fbConnected; }catch(e){ return false; } }
  function getProducts(){ try{ return products||{}; }catch(e){ return {}; } }
  function authed(){ try{ return !!firebase.auth().currentUser; }catch(e){ return false; } }
  function toast(m){ try{ showToast(m); }catch(e){} }

  var scripts = {}, order = [], boundPath = null, boundRef = null, shownCode = null, pending = null;
  var size = Math.min(40, Math.max(14, +(LS.get('ccs_size') || 22)));
  var isOpen = LS.get('ccs_open') === '1';

  /* ── หน้าตา ── */
  var css = document.createElement('style');
  css.textContent = `
  #ccsTab{position:fixed;right:12px;bottom:84px;z-index:150;border:0;border-radius:22px;padding:10px 16px;background:#f2c94c;color:#111;font:700 15px Kanit,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.25);cursor:pointer}
  #ccsPanel{position:fixed;top:0;right:0;bottom:64px;width:clamp(320px,44vw,580px);z-index:150;background:#0b0f1a;color:#eef1f7;display:none;flex-direction:column;box-shadow:-6px 0 24px rgba(0,0,0,.35);font-family:Sarabun,Kanit,sans-serif}
  #ccsPanel.open{display:flex}
  @media(max-width:700px){#ccsPanel{width:100vw}}
  #ccsPanel *{box-sizing:border-box}
  .ccs-top{display:flex;gap:8px;align-items:center;padding:12px 14px;border-bottom:1px solid #222a3d;flex-wrap:wrap}
  .ccs-brand{background:#f2c94c;color:#111;font:700 13px Kanit,sans-serif;letter-spacing:.08em;padding:4px 10px;border-radius:8px}
  .ccs-sz{color:#8d97ad;font-size:13px;flex:1}
  .ccs-btn{min-height:40px;min-width:44px;padding:0 12px;border-radius:10px;border:1px solid #2c3650;background:#141a2a;color:#eef1f7;font:600 15px Kanit,sans-serif;cursor:pointer}
  .ccs-btn.y{background:#f2c94c;color:#111;border-color:#f2c94c}
  .ccs-body{flex:1;overflow:auto;padding:14px;display:flex;flex-direction:column;gap:12px}
  .ccs-head{background:#141a2a;border:1px solid #222a3d;border-radius:16px;padding:14px 16px}
  .ccs-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .ccs-code{font:800 40px/1 Kanit,sans-serif;color:#f2c94c}
  .ccs-tag{border:1px solid #2c3650;background:#1b2236;border-radius:20px;padding:4px 12px;font-size:14px;color:#c7cee0}
  .ccs-price{margin-left:auto;font:800 34px/1 Kanit,sans-serif;color:#4cd18a;white-space:nowrap}
  .ccs-name{margin-top:8px;font:700 19px/1.35 Kanit,sans-serif}
  .ccs-card{background:#141a2a;border:1px solid #222a3d;border-left:6px solid var(--c);border-radius:16px;padding:14px 16px}
  .ccs-lbl{font:700 14px Kanit,sans-serif;color:var(--c);margin-bottom:6px}
  .ccs-txt{font-weight:700;line-height:1.45;white-space:pre-line}
  .ccs-empty{color:#8d97ad;text-align:center;padding:30px 10px;font-size:17px}
  .ccs-next{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 14px;border-top:1px solid #222a3d}
  .ccs-next b{color:#4cd18a;font:700 14px Kanit,sans-serif}
  .ccs-chip{min-height:40px;padding:0 14px;border-radius:12px;border:1px solid #2c3650;background:#1b2236;color:#eef1f7;font:700 16px Kanit,sans-serif;cursor:pointer}
  .ccs-chip.cur{background:#f2c94c;color:#111;border-color:#f2c94c}
  .ccs-bar{padding:10px 14px;background:#1b2236;border-bottom:1px solid #2c3650;font-size:14px;display:none;gap:8px;align-items:center;flex-wrap:wrap}
  .ccs-bar.show{display:flex}`;
  document.head.appendChild(css);

  var tab = document.createElement('button');
  tab.id = 'ccsTab'; tab.type = 'button'; tab.textContent = '📜 สคริปต์';
  var panel = document.createElement('aside');
  panel.id = 'ccsPanel';
  panel.innerHTML =
    '<div class="ccs-top"><span class="ccs-brand">CHICCOCO</span><span class="ccs-sz" id="ccsSz"></span>' +
    '<button class="ccs-btn" type="button" id="ccsMinus">A-</button><button class="ccs-btn" type="button" id="ccsPlus">A+</button>' +
    '<label class="ccs-btn" style="display:flex;align-items:center">โหลดไฟล์<input id="ccsFile" type="file" accept=".xlsx,.xls,.csv" hidden></label>' +
    '<button class="ccs-btn y" type="button" id="ccsClose">ปิด</button></div>' +
    '<div class="ccs-bar" id="ccsBar"></div>' +
    '<div class="ccs-body" id="ccsBody"></div>' +
    '<div class="ccs-next" id="ccsNext"></div>';
  document.body.appendChild(panel);
  document.body.appendChild(tab);
  function $(id){ return document.getElementById(id); }

  function setOpen(v){
    isOpen = v; LS.set('ccs_open', v ? '1' : '0');
    panel.classList.toggle('open', v);
    tab.textContent = v ? '✕ ปิดสคริปต์' : '📜 สคริปต์';
    tab.style.right = v && window.innerWidth > 700 ? 'calc(clamp(320px,44vw,580px) + 12px)' : '12px';
    pushPage(v);
    if(v) render(getCode(), true);
  }
  /* ดันหน้าเดิมไปทางซ้ายตอนแผงเปิด แผงจะได้ไม่บังช่องกรอก (จอแคบ <=700px ยังซ้อนทับเหมือนเดิม) */
  function pushPage(v){
    var w = v && window.innerWidth > 700 ? panel.offsetWidth : 0;
    document.body.style.marginRight = w ? w + 'px' : '';
    var nav = document.querySelector('.bottom-nav');
    if(nav) nav.style.right = w ? w + 'px' : '';
  }
  function setSize(d){
    size = Math.min(40, Math.max(14, size + d)); LS.set('ccs_size', size);
    render(shownCode, true);
  }

  /* ── แสดงสคริปต์ ── */
  function render(code, force){
    if(!isOpen) return;
    if(!force && code === shownCode) return;
    shownCode = code;
    $('ccsSz').textContent = 'ขนาด ' + size + 'px';
    var body = $('ccsBody');
    if(!order.length){
      body.innerHTML = '<div class="ccs-empty">ยังไม่มีสคริปต์<br>กด "โหลดไฟล์" แล้วเลือก SCRIPTS_LIVE.xlsx</div>';
      renderNext(code); return;
    }
    if(!code){ body.innerHTML = '<div class="ccs-empty">ยิงบาร์โค้ดหรือพิมพ์รหัส สคริปต์จะขึ้นที่นี่</div>'; renderNext(code); return; }
    var s = scripts[up(code)];
    var p = getProducts()[code] || {};
    if(!s){
      body.innerHTML = '<div class="ccs-head"><div class="ccs-row"><span class="ccs-code">' + esc(code) + '</span></div>' +
        (p.name ? '<div class="ccs-name">' + esc(p.name) + '</div>' : '') + '</div><div class="ccs-empty">ยังไม่มีสคริปต์ของรหัสนี้</div>';
      renderNext(code); return;
    }
    var price = s.price !== '' && s.price != null ? s.price : p.price;
    var sec = [
      ['#f2c94c', '1. ประโยคเปิดดึงดูด (HOOK)', s.hook],
      ['#5dade2', '2. เนื้อผ้า • ทรง • การใช้งาน', s.detail],
      ['#4cd18a', '3. จับคู่ซื้อเพิ่ม (MIX & MATCH) + ปิดการขาย', s.match]
    ];
    body.innerHTML =
      '<div class="ccs-head"><div class="ccs-row"><span class="ccs-code">' + esc(code) + '</span>' +
      (s.tag ? '<span class="ccs-tag">' + esc(s.tag) + '</span>' : '') +
      (price !== '' && price != null ? '<span class="ccs-price">' + esc(Number(price).toLocaleString()) + '.-</span>' : '') + '</div>' +
      ((s.name || p.name) ? '<div class="ccs-name">' + esc(s.name || p.name) + '</div>' : '') + '</div>' +
      sec.filter(function(x){ return String(x[2]||'').trim(); }).map(function(x){
        return '<div class="ccs-card" style="--c:' + x[0] + '"><div class="ccs-lbl">' + esc(x[1]) + '</div><div class="ccs-txt" style="font-size:' + size + 'px">' + esc(String(x[2]).trim()) + '</div></div>';
      }).join('');
    body.scrollTop = 0;
    renderNext(code);
  }
  function renderNext(code){
    var box = $('ccsNext');
    if(!order.length){ box.innerHTML = ''; return; }
    var i = code ? order.indexOf(up(code)) : -1;
    var list = order.slice(Math.max(0, i), Math.max(0, i) + 6);
    box.innerHTML = '<b>พร้อมยิง:</b>' + list.map(function(c){
      return '<button type="button" class="ccs-chip' + (code && c === up(code) ? ' cur' : '') + '" data-c="' + esc(c) + '">' + esc(c) + '</button>';
    }).join('');
  }

  /* ── ซิงค์กับ Firebase ── */
  function setData(obj){
    scripts = {}; var arr = [];
    Object.keys(obj || {}).forEach(function(k){ var v = obj[k] || {}; scripts[up(k)] = v; arr.push([up(k), +v.i || 0]); });
    arr.sort(function(a,b){ return a[1] - b[1] || a[0].localeCompare(b[0], undefined, {numeric:true}); });
    order = arr.map(function(a){ return a[0]; });
    render(getCode(), true);
  }
  function bind(){
    var d = getDb(), path = getPath();
    if(!d || !getConn() || !authed() || !path) return;
    if(boundPath === path) return;
    try{ if(boundRef) boundRef.off(); }catch(e){}
    boundPath = path; boundRef = d.ref(path + '/scripts');
    boundRef.on('value', function(snap){ setData(snap.val()); }, function(err){ $('ccsBody').innerHTML = '<div class="ccs-empty">อ่านสคริปต์ไม่ได้: ' + esc(err && err.message) + '</div>'; });
  }

  /* ── โหลดไฟล์ Excel ── */
  function pick(row, keys){
    var ks = Object.keys(row);
    for(var j = 0; j < keys.length; j++){
      for(var i = 0; i < ks.length; i++){ if(ks[i].trim().toLowerCase().indexOf(keys[j]) > -1) return row[ks[i]]; }
    }
    return '';
  }
  function bar(html){ var b = $('ccsBar'); b.innerHTML = html; b.classList.toggle('show', !!html); }
  $('ccsFile').addEventListener('change', function(e){
    var f = e.target.files[0]; e.target.value = '';
    if(!f) return;
    if(typeof XLSX === 'undefined'){ bar('อ่านไฟล์ Excel ไม่ได้ ลองรีเฟรชหน้าแล้วโหลดใหม่ <button class="ccs-btn" type="button" data-x="cancel">ปิด</button>'); return; }
    var rd = new FileReader();
    rd.onload = function(){
      try{
        var wb = XLSX.read(new Uint8Array(rd.result), {type:'array'});
        var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], {defval:''});
        var obj = {}, n = 0;
        rows.forEach(function(r){
          var code = up(pick(r, ['รหัส','code']));
          if(!code || !/^[A-Z0-9_-]{1,20}$/.test(code)) return;
          obj[code] = { i:n++, name:String(pick(r,['ชื่อ','name'])), price:pick(r,['ราคา','price']),
            tag:String(pick(r,['ป้าย','หมวด','tag'])), hook:String(pick(r,['hook','เปิด'])),
            detail:String(pick(r,['จุดเด่น','เนื้อผ้า','detail'])), match:String(pick(r,['จับคู่','ปิดการขาย','match'])) };
        });
        if(!n){ bar('ไม่พบคอลัมน์ "รหัส" ในไฟล์ <button class="ccs-btn" type="button" data-x="cancel">ปิด</button>'); return; }
        pending = obj;
        bar('ไฟล์ ' + esc(f.name) + ' มี ' + n + ' รหัส จะแทนที่สคริปต์เดิม ' + order.length + ' รหัส ' +
          '<button class="ccs-btn y" type="button" data-x="ok">ยืนยัน</button><button class="ccs-btn" type="button" data-x="cancel">ยกเลิก</button>');
      }catch(err){ bar('อ่านไฟล์ไม่ได้: ' + esc(err.message) + ' <button class="ccs-btn" type="button" data-x="cancel">ปิด</button>'); }
    };
    rd.readAsArrayBuffer(f);
  });
  $('ccsBar').addEventListener('click', function(e){
    var b = e.target.closest('[data-x]'); if(!b) return;
    if(b.getAttribute('data-x') === 'ok' && pending){
      var d = getDb(), path = getPath();
      if(!d || !getConn() || !path){ bar('ยังไม่ได้เชื่อมต่อ Firebase ลองใหม่อีกครั้ง <button class="ccs-btn" type="button" data-x="cancel">ปิด</button>'); return; }
      var cnt = Object.keys(pending).length;
      d.ref(path + '/scripts').set(pending).then(function(){ toast('✅ โหลดสคริปต์ ' + cnt + ' รหัสแล้วค่ะ'); bar(''); pending = null; })
        .catch(function(err){ bar('บันทึกไม่สำเร็จ: ' + esc(err.message) + ' <button class="ccs-btn" type="button" data-x="cancel">ปิด</button>'); });
    } else { pending = null; bar(''); }
  });

  /* ── ปุ่ม ── */
  tab.addEventListener('click', function(){ setOpen(!isOpen); });
  $('ccsClose').addEventListener('click', function(){ setOpen(false); });
  $('ccsMinus').addEventListener('click', function(){ setSize(-2); });
  $('ccsPlus').addEventListener('click', function(){ setSize(2); });
  $('ccsNext').addEventListener('click', function(e){
    var b = e.target.closest('[data-c]'); if(!b) return;
    var c = b.getAttribute('data-c');
    var real = Object.keys(getProducts()).find(function(k){ return up(k) === c; });
    if(real && typeof selectProduct === 'function') selectProduct(real);
    else render(c, true);
  });
  window.addEventListener('resize', function(){ if(isOpen) setOpen(true); });

  /* ── ติดตามรหัสปัจจุบัน (ไม่แตะฟังก์ชันเดิม) ── */
  setInterval(function(){ bind(); var c = getCode(); if(c !== shownCode) render(c, false); }, 300);
  setOpen(isOpen);
})();
