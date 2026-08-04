/* 公開観測アーカイブ */
(function () {
  'use strict';

  var records = [];
  var keyword = '';
  var selectedDimensions = [];
  var selectedTags = [];
  var themeKey = 'omn-theme';

  function $(id) { return document.getElementById(id); }

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function toast(message) {
    var node = $('toast');
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { node.hidden = true; }, 2400);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem(themeKey, theme); } catch (e) {}
    $('btn-theme').textContent = theme === 'dark' ? '☀ ライト' : '🌙 ダーク';
  }

  function displayDate(value) {
    if (!value) return '';
    var parts = String(value).slice(0, 10).split('-');
    if (parts.length !== 3) return value;
    return parts[0] + '年' + Number(parts[1]) + '月' + Number(parts[2]) + '日';
  }

  function unique(field) {
    var set = {};
    records.forEach(function (record) {
      (record[field] || []).forEach(function (value) { set[value] = true; });
    });
    return Object.keys(set).sort();
  }

  function toggle(list, value) {
    var index = list.indexOf(value);
    if (index >= 0) list.splice(index, 1);
    else list.push(value);
  }

  function chip(text, active, handler) {
    var button = el('button', 'chip' + (active ? ' on' : ''), text);
    button.type = 'button';
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
    button.addEventListener('click', handler);
    return button;
  }

  function renderFilters() {
    var dimensions = $('public-filter-dimensions');
    var tags = $('public-filter-tags');
    dimensions.innerHTML = '';
    tags.innerHTML = '';

    unique('dimensions').forEach(function (value) {
      dimensions.appendChild(chip(value, selectedDimensions.indexOf(value) >= 0, function () {
        toggle(selectedDimensions, value);
        renderFilters();
        renderList();
      }));
    });

    unique('tags').forEach(function (value) {
      tags.appendChild(chip('#' + value, selectedTags.indexOf(value) >= 0, function () {
        toggle(selectedTags, value);
        renderFilters();
        renderList();
      }));
    });

    if (!tags.children.length) tags.appendChild(el('span', 'muted small', 'まだタグがありません'));

    var count = selectedDimensions.length + selectedTags.length;
    $('public-filter-count').textContent = count ? '（' + count + '件選択中）' : '';
  }

  function matches(record) {
    var haystack = [
      record.title || '',
      record.body || '',
      record.summary || '',
      (record.tags || []).join(' '),
      (record.dimensions || []).join(' '),
      (record.entry || []).join(' '),
      (record.state || []).join(' '),
      (record.stage || []).join(' ')
    ].join('\n').toLowerCase();

    if (keyword && haystack.indexOf(keyword.toLowerCase()) < 0) return false;
    if (selectedDimensions.length && !selectedDimensions.some(function (v) {
      return (record.dimensions || []).indexOf(v) >= 0;
    })) return false;
    if (selectedTags.length && !selectedTags.some(function (v) {
      return (record.tags || []).indexOf(v) >= 0;
    })) return false;
    return true;
  }

  function excerpt(record) {
    var text = (record.summary || record.body || '').replace(/\s+/g, ' ').trim();
    return text.slice(0, 150) + (text.length > 150 ? '…' : '');
  }

  function addStaticChip(host, text) {
    var item = el('span', 'chip chip-static', text);
    host.appendChild(item);
  }

  function recordUrl(id) {
    var url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('id', id);
    return url.toString();
  }

  function renderList() {
    var filtered = records.filter(matches).sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
    var host = $('public-cards');
    host.innerHTML = '';

    filtered.forEach(function (record) {
      var link = el('a', 'card public-card');
      link.href = '?id=' + encodeURIComponent(record.id);
      link.setAttribute('data-id', record.id);
      link.appendChild(el('h3', 'card-title', record.title));
      link.appendChild(el('p', 'card-date', displayDate(record.date) + '｜' + (record.stage || []).join(' / ')));
      link.appendChild(el('p', 'card-excerpt', excerpt(record)));

      var labels = el('div', 'labels');
      (record.dimensions || []).forEach(function (value) { addStaticChip(labels, value); });
      (record.tags || []).forEach(function (value) { addStaticChip(labels, '#' + value); });
      link.appendChild(labels);
      host.appendChild(link);
    });

    $('public-loading').hidden = true;
    $('public-empty').hidden = filtered.length > 0;
    $('public-result-count').textContent = filtered.length + ' 件 / 全 ' + records.length + ' 件';
  }

  function renderExtra(record) {
    var host = $('public-extra');
    host.innerHTML = '';
    [
      ['次元展開', record.dimExpand],
      ['整理メモ', record.memo],
      ['研究への接続', record.research],
      ['関連記録', record.related]
    ].forEach(function (item) {
      if (!item[1]) return;
      host.appendChild(el('h3', 'sec-head', item[0]));
      host.appendChild(el('div', 'longtext', item[1]));
    });
  }

  function setStructuredData(record) {
    var old = document.getElementById('observation-jsonld');
    if (old) old.remove();
    var script = document.createElement('script');
    script.id = 'observation-jsonld';
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: record.title,
      datePublished: record.date,
      dateModified: record.updatedAt || record.date,
      author: {
        '@type': 'Person',
        name: '中谷まり亜',
        alternateName: 'Maria Nakatani',
        url: 'https://marnakatani-bot.github.io/maria-dimension-map-/'
      },
      mainEntityOfPage: recordUrl(record.id),
      articleSection: '意識の次元マッピング｜一次観測',
      keywords: (record.tags || []).join(', ')
    });
    document.head.appendChild(script);
  }

  function openDetail(id, pushState) {
    var record = records.find(function (item) { return item.id === id; });
    if (!record) {
      showList(false);
      toast('指定された公開観測が見つかりません');
      return;
    }

    $('public-title').textContent = record.title;
    $('public-date').textContent = '記録日：' + displayDate(record.date) + '｜観測・執筆：中谷まり亜（Maria Nakatani）';
    $('public-body').textContent = record.body || '';

    var labels = $('public-labels');
    labels.innerHTML = '';
    (record.entry || []).forEach(function (value) { addStaticChip(labels, value); });
    (record.dimensions || []).forEach(function (value) { addStaticChip(labels, value); });
    (record.state || []).forEach(function (value) { addStaticChip(labels, value); });
    (record.stage || []).forEach(function (value) { addStaticChip(labels, value); });
    (record.tags || []).forEach(function (value) { addStaticChip(labels, '#' + value); });

    renderExtra(record);
    $('public-list-view').hidden = true;
    $('public-detail-view').hidden = false;
    document.title = record.title + '｜公開観測アーカイブ';
    setStructuredData(record);

    if (pushState !== false) {
      history.pushState({ id: id }, '', '?id=' + encodeURIComponent(id));
    }
    window.scrollTo(0, 0);

    $('public-share').onclick = function () {
      var url = recordUrl(record.id);
      if (navigator.share) {
        navigator.share({ title: record.title, text: '意識の次元マッピング｜公開一次観測', url: url }).catch(function () {});
        return;
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(url).then(function () { toast('個別URLをコピーしました'); });
      } else {
        window.prompt('このURLをコピーしてください', url);
      }
    };
  }

  function showList(pushState) {
    $('public-detail-view').hidden = true;
    $('public-list-view').hidden = false;
    document.title = '公開観測アーカイブ｜意識の次元マッピング';
    var jsonld = document.getElementById('observation-jsonld');
    if (jsonld) jsonld.remove();
    if (pushState !== false) history.pushState({}, '', window.location.pathname);
    window.scrollTo(0, 0);
  }

  function bind() {
    $('btn-theme').addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
    $('public-q').addEventListener('input', function () {
      keyword = this.value.trim();
      renderList();
    });
    $('public-clear').addEventListener('click', function () {
      keyword = '';
      selectedDimensions = [];
      selectedTags = [];
      $('public-q').value = '';
      renderFilters();
      renderList();
      toast('すべての公開観測を表示しています');
    });
    $('public-back').addEventListener('click', function () { showList(true); });
    window.addEventListener('popstate', function () {
      var id = new URL(window.location.href).searchParams.get('id');
      if (id) openDetail(id, false);
      else showList(false);
    });
  }

  function start() {
    var savedTheme = null;
    try { savedTheme = localStorage.getItem(themeKey); } catch (e) {}
    if (!savedTheme) {
      savedTheme = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(savedTheme);
    bind();

    fetch('public-observations.json?updated=' + Date.now(), { cache: 'no-store' })
      .then(function (response) {
        if (!response.ok) throw new Error('HTTP ' + response.status);
        return response.json();
      })
      .then(function (data) {
        records = data && Array.isArray(data.records) ? data.records : [];
        renderFilters();
        renderList();
        var id = new URL(window.location.href).searchParams.get('id');
        if (id) openDetail(id, false);
      })
      .catch(function (error) {
        console.error(error);
        $('public-loading').hidden = true;
        $('public-error').hidden = false;
      });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
