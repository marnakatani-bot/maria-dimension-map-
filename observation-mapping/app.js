/* =========================================================
   観測マッピング・ノート  app.js
   - データはこのブラウザー内（IndexedDB）だけに保存します。
   - 外部サーバー・外部AIへの送信は一切ありません。
   ========================================================= */
(function () {
  'use strict';

  /* ---------- ラベル定義 ---------- */
  var GROUPS = [
    { key: 'entry', name: '情報の入口', items: ['現実', '観測', 'ひらめき', '夢', '身体反応'] },
    { key: 'dim',   name: '次元',       items: ['3D', '4D', '5D', '6D', '7D', '8D', '9D'] },
    { key: 'state', name: '状態',       items: ['通常', '複数視座', 'シフト中', '未判定'] },
    { key: 'stage', name: '研究工程',   items: ['一次観測', '仮説化前', 'マリアメモ候補', 'マリアメモ化済み', '論文候補', '論文採用済み', 'Bluesky投稿済み'] }
  ];
  var EXTRA_FIELDS = [
    { key: 'dimExpand', name: '次元展開' },
    { key: 'memo',      name: '整理メモ' },
    { key: 'research',  name: '研究への接続' },
    { key: 'related',   name: '関連記録' }
  ];

  /* ---------- 保存層（IndexedDB／自動でlocalStorageに切替） ---------- */
  var DB_NAME = 'observation-mapping-note';
  var STORE = 'records';
  var LS_KEY = 'omn-records';
  var LS_THEME = 'omn-theme';
  var LS_SEEDED = 'omn-seeded';

  var Store = {
    mode: 'idb',
    db: null,

    open: function () {
      var self = this;
      return new Promise(function (resolve) {
        if (!('indexedDB' in window)) { self.mode = 'ls'; return resolve(); }
        var req;
        try { req = indexedDB.open(DB_NAME, 1); }
        catch (e) { self.mode = 'ls'; return resolve(); }
        req.onupgradeneeded = function () {
          var db = req.result;
          if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
        };
        req.onsuccess = function () { self.db = req.result; self.mode = 'idb'; resolve(); };
        req.onerror = function () { self.mode = 'ls'; resolve(); };
        req.onblocked = function () { self.mode = 'ls'; resolve(); };
      });
    },

    _lsAll: function () {
      try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch (e) { return []; }
    },
    _lsSave: function (arr) {
      localStorage.setItem(LS_KEY, JSON.stringify(arr));
    },

    all: function () {
      var self = this;
      if (self.mode === 'ls') return Promise.resolve(self._lsAll());
      return new Promise(function (resolve) {
        var tx = self.db.transaction(STORE, 'readonly');
        var req = tx.objectStore(STORE).getAll();
        req.onsuccess = function () { resolve(req.result || []); };
        req.onerror = function () { resolve([]); };
      });
    },

    put: function (rec) {
      var self = this;
      if (self.mode === 'ls') {
        var arr = self._lsAll();
        var i = arr.findIndex(function (r) { return r.id === rec.id; });
        if (i >= 0) arr[i] = rec; else arr.push(rec);
        self._lsSave(arr);
        return Promise.resolve();
      }
      return new Promise(function (resolve, reject) {
        var tx = self.db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(rec);
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error); };
      });
    },

    remove: function (id) {
      var self = this;
      if (self.mode === 'ls') {
        self._lsSave(self._lsAll().filter(function (r) { return r.id !== id; }));
        return Promise.resolve();
      }
      return new Promise(function (resolve, reject) {
        var tx = self.db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error); };
      });
    },

    clear: function () {
      var self = this;
      if (self.mode === 'ls') { self._lsSave([]); return Promise.resolve(); }
      return new Promise(function (resolve, reject) {
        var tx = self.db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = resolve;
        tx.onerror = function () { reject(tx.error); };
      });
    }
  };

  /* ---------- 小道具 ---------- */
  function $(id) { return document.getElementById(id); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text !== undefined && text !== null) n.textContent = text;
    return n;
  }
  function uid() {
    return 'r-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function toLocalInput(d) {
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
      'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function fromLocalInput(s) {
    if (!s) return new Date().toISOString();
    var d = new Date(s);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  function fmt(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    return d.getFullYear() + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日 ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes());
  }
  function autoTitle(body) {
    var line = (body || '').split('\n').map(function (s) { return s.trim(); })
      .filter(function (s) { return s; })[0] || '無題の観測';
    return line.length > 24 ? line.slice(0, 24) + '…' : line;
  }
  function toast(msg) {
    var t = $('toast');
    t.textContent = msg;
    t.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(function () { t.hidden = true; }, 2200);
  }
  function confirmBox(title, text) {
    return new Promise(function (resolve) {
      var m = $('modal');
      $('modal-title').textContent = title;
      $('modal-text').textContent = text;
      m.hidden = false;
      function done(v) {
        m.hidden = true;
        $('modal-ok').removeEventListener('click', ok);
        $('modal-cancel').removeEventListener('click', no);
        resolve(v);
      }
      function ok() { done(true); }
      function no() { done(false); }
      $('modal-ok').addEventListener('click', ok);
      $('modal-cancel').addEventListener('click', no);
    });
  }

  /* ---------- 記録の正規化（読み込み時の安全策） ---------- */
  function normalize(r) {
    var o = {
      id: (r && r.id) ? String(r.id) : uid(),
      title: (r && typeof r.title === 'string') ? r.title : '',
      body: (r && typeof r.body === 'string') ? r.body : '',
      createdAt: (r && r.createdAt) ? r.createdAt : new Date().toISOString(),
      updatedAt: (r && r.updatedAt) ? r.updatedAt : new Date().toISOString(),
      tags: (r && Array.isArray(r.tags)) ? r.tags.map(String) : []
    };
    GROUPS.forEach(function (g) {
      o[g.key] = (r && Array.isArray(r[g.key])) ? r[g.key].map(String) : [];
    });
    EXTRA_FIELDS.forEach(function (f) {
      o[f.key] = (r && typeof r[f.key] === 'string') ? r[f.key] : '';
    });
    if (!o.title) o.title = autoTitle(o.body);
    return o;
  }

  /* ---------- サンプル記録（内容は変更しないこと） ---------- */
  function sampleRecord() {
    return normalize({
      id: 'sample-shigoto-tte-nai',
      title: '仕事ってないんだよ',
      body: '目覚まし時計もスケジュールもない。\nセミのオーケストラを聞きながら、仕事をしない朝。\nその気持ちよさと一体化していたら「仕事ってないんだよ」とバンッと浮かぶ。',
      dimExpand: '3D：仕事や役割という助け合いの経済活動\n\n4D：自己実現や天命が自然に経済に結びつくので、仕事と括られた\n\n5D：お役目という言葉も消える。何かのためにしているという意図や方向性はなくなる\n\n6D：無・空\n\n7D：生の情報データをそのまま送受信し、それを思考として出力して、そのまま記す。それが人間を超えた全体性の役割と位置づけられる\n\n8D：情報が飽和し、パターン解析から新法則を出力する',
      memo: '',
      research: '',
      related: '',
      entry: ['現実', '観測', 'ひらめき'],
      dim: ['3D', '4D', '5D', '6D', '7D', '8D'],
      state: ['複数視座'],
      stage: ['一次観測', 'マリアメモ候補'],
      tags: ['仕事', '役割', '経済', '情報受信', '飽和', '新法則'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  /* ---------- 状態 ---------- */
  var records = [];
  var filters = { entry: [], dim: [], state: [], stage: [], tags: [] };
  var keyword = '';
  var editing = null;   // 編集中の記録（新規の場合はid未保存）
  var editTags = [];
  var currentId = null;

  /* ---------- 画面切り替え ---------- */
  var VIEWS = ['view-list', 'view-detail', 'view-edit', 'view-backup'];
  function show(id) {
    VIEWS.forEach(function (v) { $(v).hidden = (v !== id); });
    window.scrollTo(0, 0);
  }

  /* ---------- チップ生成 ---------- */
  function chip(text, on, onClick, extraClass) {
    var b = el('button', 'chip' + (on ? ' on' : '') + (extraClass ? ' ' + extraClass : ''), text);
    b.type = 'button';
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (onClick) b.addEventListener('click', onClick); else b.classList.add('chip-static');
    return b;
  }

  /* ---------- 絞り込みUI ---------- */
  function allTags() {
    var set = {};
    records.forEach(function (r) { r.tags.forEach(function (t) { set[t] = 1; }); });
    return Object.keys(set).sort();
  }

  function renderFilters() {
    var host = $('filter-body');
    host.innerHTML = '';
    GROUPS.forEach(function (g) {
      var box = el('div', 'group');
      box.appendChild(el('p', 'group-name', g.name));
      var row = el('div', 'labels');
      g.items.forEach(function (name) {
        var on = filters[g.key].indexOf(name) >= 0;
        row.appendChild(chip(name, on, function () {
          toggle(filters[g.key], name);
          renderFilters(); renderList();
        }));
      });
      box.appendChild(row);
      host.appendChild(box);
    });
    var tags = allTags();
    var tbox = el('div', 'group');
    tbox.appendChild(el('p', 'group-name', '自由タグ'));
    var trow = el('div', 'labels');
    if (!tags.length) trow.appendChild(el('span', 'muted small', 'まだタグがありません'));
    tags.forEach(function (t) {
      var on = filters.tags.indexOf(t) >= 0;
      trow.appendChild(chip('#' + t, on, function () {
        toggle(filters.tags, t);
        renderFilters(); renderList();
      }));
    });
    tbox.appendChild(trow);
    host.appendChild(tbox);

    var n = 0;
    Object.keys(filters).forEach(function (k) { n += filters[k].length; });
    $('filter-count').textContent = n ? '（' + n + '件選択中）' : '';
  }

  function toggle(arr, v) {
    var i = arr.indexOf(v);
    if (i >= 0) arr.splice(i, 1); else arr.push(v);
  }

  /* ---------- 絞り込み計算（グループ内はOR、グループ間はAND） ---------- */
  function matches(r) {
    var k = keyword.trim().toLowerCase();
    if (k) {
      var hay = [r.title, r.body, r.dimExpand, r.memo, r.research, r.related]
        .join('\n').toLowerCase() + '\n' + r.tags.join(' ').toLowerCase();
      if (hay.indexOf(k) < 0) return false;
    }
    var keys = ['entry', 'dim', 'state', 'stage'];
    for (var i = 0; i < keys.length; i++) {
      var sel = filters[keys[i]];
      if (sel.length) {
        var hit = sel.some(function (v) { return r[keys[i]].indexOf(v) >= 0; });
        if (!hit) return false;
      }
    }
    if (filters.tags.length) {
      var th = filters.tags.some(function (v) { return r.tags.indexOf(v) >= 0; });
      if (!th) return false;
    }
    return true;
  }

  function filtered() {
    return records.filter(matches).sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }

  /* ---------- 一覧 ---------- */
  function renderList() {
    var list = filtered();
    var host = $('cards');
    host.innerHTML = '';
    list.forEach(function (r) {
      var c = el('button', 'card');
      c.type = 'button';
      c.setAttribute('data-id', r.id);
      c.appendChild(el('h3', 'card-title', r.title));
      c.appendChild(el('p', 'card-date', fmt(r.createdAt)));
      var ex = r.body.replace(/\s+/g, ' ').slice(0, 90);
      c.appendChild(el('p', 'card-excerpt', ex + (r.body.length > 90 ? '…' : '')));
      var lab = el('div', 'labels');
      GROUPS.forEach(function (g) {
        r[g.key].forEach(function (v) { lab.appendChild(chip(v, false, null)); });
      });
      r.tags.forEach(function (t) { lab.appendChild(chip('#' + t, false, null)); });
      c.appendChild(lab);
      c.addEventListener('click', function () { openDetail(r.id); });
      host.appendChild(c);
    });
    $('empty-msg').hidden = list.length > 0;
    $('result-count').textContent = list.length + ' 件 / 全 ' + records.length + ' 件';
  }

  /* ---------- 詳細 ---------- */
  function openDetail(id) {
    var r = records.find(function (x) { return x.id === id; });
    if (!r) return;
    currentId = id;
    $('d-title').textContent = r.title;
    $('d-date').textContent = '記録日時：' + fmt(r.createdAt);
    var lab = $('d-labels');
    lab.innerHTML = '';
    GROUPS.forEach(function (g) {
      r[g.key].forEach(function (v) { lab.appendChild(chip(v, false, null)); });
    });
    r.tags.forEach(function (t) { lab.appendChild(chip('#' + t, false, null)); });
    $('d-body').textContent = r.body;

    var ex = $('d-extra');
    ex.innerHTML = '';
    EXTRA_FIELDS.forEach(function (f) {
      if (!r[f.key]) return;
      ex.appendChild(el('h3', 'sec-head', f.name));
      ex.appendChild(el('div', 'longtext', r[f.key]));
    });
    show('view-detail');
  }

  /* ---------- 入力画面 ---------- */
  function renderEditLabels() {
    var host = $('edit-labels');
    host.innerHTML = '';
    GROUPS.forEach(function (g) {
      var box = el('div', 'group');
      box.appendChild(el('p', 'group-name', g.name + '（複数選択できます）'));
      var row = el('div', 'labels');
      g.items.forEach(function (name) {
        var on = editing[g.key].indexOf(name) >= 0;
        row.appendChild(chip(name, on, function () {
          toggle(editing[g.key], name);
          renderEditLabels();
        }));
      });
      box.appendChild(row);
      host.appendChild(box);
    });
  }

  function renderEditTags() {
    var host = $('tag-chips');
    host.innerHTML = '';
    editTags.forEach(function (t, i) {
      var b = el('span', 'chip on');
      b.appendChild(document.createTextNode('#' + t));
      var x = el('button', 'chip-del', '×');
      x.type = 'button';
      x.setAttribute('aria-label', t + ' を外す');
      x.addEventListener('click', function () { editTags.splice(i, 1); renderEditTags(); });
      b.appendChild(x);
      host.appendChild(b);
    });
  }

  function openEditor(rec) {
    editing = rec ? JSON.parse(JSON.stringify(rec)) : normalize({ body: '' });
    if (!rec) editing.title = '';
    editTags = editing.tags.slice();
    $('edit-head').textContent = rec ? '記録を編集' : '新しい観測を記録';
    $('f-body').value = editing.body;
    $('f-title').value = rec ? editing.title : '';
    $('f-date').value = toLocalInput(new Date(editing.createdAt));
    EXTRA_FIELDS.forEach(function (f) {
      $({ dimExpand: 'f-dim', memo: 'f-memo', research: 'f-link', related: 'f-rel' }[f.key]).value = editing[f.key];
    });
    $('f-tags').value = '';
    renderEditLabels();
    renderEditTags();
    show('view-edit');
  }

  function addTagFromInput() {
    var v = $('f-tags').value.trim();
    if (!v) return;
    v.split(/[,、\s]+/).forEach(function (t) {
      t = t.replace(/^#/, '').trim();
      if (t && editTags.indexOf(t) < 0) editTags.push(t);
    });
    $('f-tags').value = '';
    renderEditTags();
  }

  function saveEditing() {
    var body = $('f-body').value;
    if (!body.trim()) { toast('本文を入力してください'); $('f-body').focus(); return; }
    editing.body = body;                       // 原文はそのまま保存
    var t = $('f-title').value.trim();
    editing.title = t || autoTitle(body);
    editing.createdAt = fromLocalInput($('f-date').value);
    editing.updatedAt = new Date().toISOString();
    editing.tags = editTags.slice();
    editing.dimExpand = $('f-dim').value;
    editing.memo = $('f-memo').value;
    editing.research = $('f-link').value;
    editing.related = $('f-rel').value;

    var rec = normalize(editing);
    Store.put(rec).then(function () {
      var i = records.findIndex(function (r) { return r.id === rec.id; });
      if (i >= 0) records[i] = rec; else records.push(rec);
      renderFilters(); renderList();
      toast('保存しました');
      openDetail(rec.id);
    });
  }

  /* ---------- 複製・削除 ---------- */
  function duplicate(id) {
    var r = records.find(function (x) { return x.id === id; });
    if (!r) return;
    var copy = JSON.parse(JSON.stringify(r));
    copy.id = uid();
    copy.title = r.title + '（複製）';
    copy.createdAt = new Date().toISOString();
    copy.updatedAt = copy.createdAt;
    Store.put(copy).then(function () {
      records.push(copy);
      renderFilters(); renderList();
      toast('複製しました');
      openDetail(copy.id);
    });
  }

  function removeRecord(id) {
    var r = records.find(function (x) { return x.id === id; });
    if (!r) return;
    confirmBox('この記録を削除しますか？', '「' + r.title + '」を削除します。削除すると元に戻せません。')
      .then(function (ok) {
        if (!ok) return;
        Store.remove(id).then(function () {
          records = records.filter(function (x) { return x.id !== id; });
          renderFilters(); renderList();
          toast('削除しました');
          show('view-list');
        });
      });
  }

  /* ---------- 書き出し ---------- */
  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
  }
  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime + ';charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }
  function exportJSON() {
    var data = { app: '観測マッピング・ノート', version: 1, exportedAt: new Date().toISOString(), records: records };
    download('観測マッピング-バックアップ-' + stamp() + '.json', JSON.stringify(data, null, 2), 'application/json');
    $('backup-msg').textContent = 'JSONを書き出しました。';
  }
  function toMarkdown() {
    var out = ['# 観測マッピング・ノート バックアップ', '', '書き出し日時：' + fmt(new Date().toISOString()), '記録数：' + records.length, ''];
    records.slice().sort(function (a, b) { return new Date(a.createdAt) - new Date(b.createdAt); })
      .forEach(function (r) {
        out.push('---', '', '## ' + r.title, '', '- 記録日時：' + fmt(r.createdAt));
        GROUPS.forEach(function (g) {
          if (r[g.key].length) out.push('- ' + g.name + '：' + r[g.key].join(' / '));
        });
        if (r.tags.length) out.push('- 自由タグ：' + r.tags.map(function (t) { return '#' + t; }).join(' '));
        out.push('', '### 原文', '', r.body, '');
        EXTRA_FIELDS.forEach(function (f) {
          if (r[f.key]) out.push('### ' + f.name, '', r[f.key], '');
        });
      });
    return out.join('\n');
  }
  function exportMD() {
    download('観測マッピング-バックアップ-' + stamp() + '.md', toMarkdown(), 'text/markdown');
    $('backup-msg').textContent = 'Markdownを書き出しました。';
  }

  /* ---------- Sol相談用コピー ---------- */
  function recordToSolMarkdown(r) {
    var out = [
      '# Sol相談用｜' + r.title,
      '',
      '- 記録日時：' + fmt(r.createdAt)
    ];
    GROUPS.forEach(function (g) {
      if (r[g.key].length) out.push('- ' + g.name + '：' + r[g.key].join(' / '));
    });
    if (r.tags.length) out.push('- 自由タグ：' + r.tags.map(function (t) { return '#' + t; }).join(' '));
    out.push('', '## 原観測（改変せず扱ってください）', '', r.body, '');
    EXTRA_FIELDS.forEach(function (f) {
      if (r[f.key]) out.push('## ' + f.name, '', r[f.key], '');
    });
    out.push(
      '## Solへの相談',
      '',
      '上の原観測を改変せず、構造整理・既存理論との照合・マリアメモ候補／論文候補の判定を手伝ってください。',
      '追加で相談したいこと：'
    );
    return out.join('\n');
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      try {
        if (!document.execCommand('copy')) throw new Error('copy failed');
        resolve();
      } catch (e) {
        reject(e);
      } finally {
        document.body.removeChild(area);
      }
    });
  }

  function copyForSol(id) {
    var r = records.find(function (x) { return x.id === id; });
    if (!r) return;
    copyText(recordToSolMarkdown(r)).then(function () {
      toast('Sol相談用の文章をコピーしました');
    }).catch(function () {
      download('Sol相談用-' + stamp() + '.md', recordToSolMarkdown(r), 'text/markdown');
      toast('コピーできなかったため、ファイルに保存しました');
    });
  }

  /* ---------- 読み込み（復元） ---------- */
  var importMode = 'add';
  function handleFile(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var parsed;
      try { parsed = JSON.parse(String(reader.result)); }
      catch (e) { $('backup-msg').textContent = 'このファイルは読み込めませんでした（JSONではありません）。'; return; }
      var incoming = Array.isArray(parsed) ? parsed : (parsed && Array.isArray(parsed.records) ? parsed.records : null);
      if (!incoming) { $('backup-msg').textContent = 'このファイルには記録が入っていないようです。'; return; }
      var list = incoming.map(normalize);

      var run = function () {
        var chain = Promise.resolve();
        if (importMode === 'replace') {
          chain = Store.clear().then(function () { records = []; });
        }
        return chain.then(function () {
          var existing = {};
          records.forEach(function (r) { existing[r.id] = 1; });
          var added = 0;
          var seq = Promise.resolve();
          list.forEach(function (r) {
            if (importMode === 'add' && existing[r.id]) r.id = uid();
            seq = seq.then(function () {
              return Store.put(r).then(function () { records.push(r); added++; });
            });
          });
          return seq.then(function () {
            renderFilters(); renderList();
            $('backup-msg').textContent = added + ' 件を読み込みました。';
            toast('復元しました（' + added + '件）');
          });
        });
      };

      if (importMode === 'replace') {
        confirmBox('すべて置き換えますか？', '今ある ' + records.length + ' 件の記録をすべて消してから、ファイルの内容を読み込みます。')
          .then(function (ok) { if (ok) run(); });
      } else {
        run();
      }
    };
    reader.readAsText(file, 'utf-8');
  }

  /* ---------- テーマ ---------- */
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    try { localStorage.setItem(LS_THEME, t); } catch (e) {}
    $('btn-theme').textContent = (t === 'dark') ? '☀ ライト' : '🌙 ダーク';
  }

  /* ---------- 起動 ---------- */
  function bind() {
    $('btn-new').addEventListener('click', function () { openEditor(null); });
    $('btn-backup').addEventListener('click', function () { $('backup-msg').textContent = ''; show('view-backup'); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-back]'), function (b) {
      b.addEventListener('click', function () { show('view-list'); });
    });

    $('q').addEventListener('input', function () { keyword = this.value; renderList(); });
    $('btn-clear').addEventListener('click', function () {
      keyword = '';
      $('q').value = '';
      Object.keys(filters).forEach(function (k) { filters[k] = []; });
      renderFilters(); renderList();
      toast('すべての記録を表示しています');
    });

    $('form').addEventListener('submit', function (e) { e.preventDefault(); saveEditing(); });
    $('btn-addtag').addEventListener('click', addTagFromInput);
    $('f-tags').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); addTagFromInput(); }
    });

    $('btn-edit').addEventListener('click', function () {
      var r = records.find(function (x) { return x.id === currentId; });
      if (r) openEditor(r);
    });
    $('btn-dup').addEventListener('click', function () { duplicate(currentId); });
    $('btn-del').addEventListener('click', function () { removeRecord(currentId); });
    $('btn-sol-copy').addEventListener('click', function () { copyForSol(currentId); });

    $('btn-export-json').addEventListener('click', exportJSON);
    $('btn-export-md').addEventListener('click', exportMD);
    $('btn-import-add').addEventListener('click', function () { importMode = 'add'; $('file-input').click(); });
    $('btn-import-replace').addEventListener('click', function () { importMode = 'replace'; $('file-input').click(); });
    $('file-input').addEventListener('change', function () {
      if (this.files && this.files[0]) handleFile(this.files[0]);
      this.value = '';
    });

    $('btn-theme').addEventListener('click', function () {
      var now = document.documentElement.getAttribute('data-theme');
      applyTheme(now === 'dark' ? 'light' : 'dark');
    });
  }

  function start() {
    var saved = null;
    try { saved = localStorage.getItem(LS_THEME); } catch (e) {}
    if (!saved) {
      saved = (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    }
    applyTheme(saved);
    bind();

    Store.open().then(function () {
      return Store.all();
    }).then(function (rows) {
      records = rows.map(normalize);
      var seeded = false;
      try { seeded = localStorage.getItem(LS_SEEDED) === '1'; } catch (e) {}
      if (!records.length && !seeded) {
        var s = sampleRecord();
        return Store.put(s).then(function () {
          records = [s];
          try { localStorage.setItem(LS_SEEDED, '1'); } catch (e) {}
        });
      }
    }).then(function () {
      renderFilters();
      renderList();
      if (Store.mode === 'ls') {
        console.info('IndexedDBが使えないため、localStorageに保存しています。');
      }
    });

    if ('serviceWorker' in navigator && location.protocol !== 'file:') {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('service-worker.js').catch(function () {});
      });
    }
  }

  // テスト用に内部関数を公開（アプリ動作には不要）
  window.__omn = {
    get records() { return records; },
    get filters() { return filters; },
    setKeyword: function (v) { keyword = v; $('q').value = v; renderList(); },
    matches: matches, filtered: filtered, toMarkdown: toMarkdown,
    recordToSolMarkdown: recordToSolMarkdown,
    normalize: normalize, store: Store, renderList: renderList, renderFilters: renderFilters
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
