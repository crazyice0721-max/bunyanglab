(function () {
  'use strict';

  // ---------- FAQ ----------
  var data = window.FAQ_DATA || [];
  var PAGE = 10;
  var state = { cat: '전체', q: '', shown: PAGE };
  var listEl = document.getElementById('faq-list');
  var catsEl = document.getElementById('faq-cats');
  var countEl = document.getElementById('faq-count');
  var moreEl = document.getElementById('faq-more');
  var qEl = document.getElementById('faq-q');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function matches(item) {
    if (state.cat !== '전체' && item.cat !== state.cat) return false;
    if (!state.q) return true;
    var hay = (item.id + ' ' + item.q + ' ' + item.a + ' ' + item.kw + ' ' + item.svc).toLowerCase();
    return state.q.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
  }

  function renderItem(item) {
    var d = el('details', 'faq-item');
    var s = el('summary');
    s.appendChild(el('span', 'chip', item.id));
    s.appendChild(el('span', null, item.q));
    var chev = el('span', 'material-symbols-outlined chev', 'expand_more');
    chev.setAttribute('aria-hidden', 'true');
    s.appendChild(chev);
    d.appendChild(s);

    var body = el('div', 'faq-body');
    body.appendChild(el('p', null, item.a));
    var meta = el('div', 'faq-meta');
    meta.appendChild(el('span', 'chip chip-lab', item.cat));
    item.svc.split(',').forEach(function (v) { meta.appendChild(el('span', 'chip chip-svc', v.trim())); });
    if (item.link !== '불필요') {
      meta.appendChild(el('span', 'chip chip-audit', item.link === '필요' ? '상담 필요' : '상황에 따라 상담'));
    }
    body.appendChild(meta);
    d.appendChild(body);
    return d;
  }

  function renderList() {
    var found = data.filter(matches);
    listEl.textContent = '';
    if (!found.length) {
      listEl.appendChild(el('p', 'faq-empty', '일치하는 질문이 없습니다. 다른 단어로 검색하거나 상담을 신청해 주세요.'));
    } else {
      found.slice(0, state.shown).forEach(function (item) { listEl.appendChild(renderItem(item)); });
    }
    countEl.textContent = found.length + '건';
    var rest = found.length - state.shown;
    moreEl.hidden = rest <= 0;
    if (rest > 0) moreEl.textContent = '더 보기 (' + rest + '건 남음)';
  }

  function renderCats() {
    var cats = ['전체'];
    data.forEach(function (i) { if (cats.indexOf(i.cat) === -1) cats.push(i.cat); });
    cats.forEach(function (c) {
      var b = el('button', 'chip filter', c);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(c === state.cat));
      b.addEventListener('click', function () {
        state.cat = c;
        state.shown = PAGE;
        Array.prototype.forEach.call(catsEl.children, function (x) { x.setAttribute('aria-pressed', String(x === b)); });
        renderList();
      });
      catsEl.appendChild(b);
    });
  }

  if (data.length) {
    renderCats();
    renderList();
    qEl.addEventListener('input', function () {
      state.q = qEl.value.trim();
      state.shown = PAGE;
      renderList();
    });
    moreEl.addEventListener('click', function () {
      state.shown += PAGE;
      renderList();
    });
  } else {
    listEl.textContent = '';
    listEl.appendChild(el('p', 'faq-empty', 'FAQ 데이터를 불러오지 못했습니다. faq-data.js 파일을 확인해 주세요.'));
  }

  // ---------- 서비스 카드의 "상담 선택" → 문의 폼 체크 ----------
  var form = document.getElementById('inquiry-form');
  Array.prototype.forEach.call(document.querySelectorAll('[data-svc]'), function (a) {
    a.addEventListener('click', function () {
      var box = form.querySelector('input[name="services"][value="' + a.getAttribute('data-svc') + '"]');
      if (box) box.checked = true;
    });
  });

  // ---------- 문의 폼 (시안: 전송하지 않음) ----------
  var errEl = document.getElementById('form-error');
  var toastEl = document.getElementById('form-toast');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    toastEl.hidden = true;
    var msg = '';
    if (!form.querySelector('input[name="services"]:checked')) msg = '관심 서비스를 1개 이상 선택해 주세요.';
    else if (!form.elements.name.value.trim()) msg = '성함 및 직함을 입력해 주세요.';
    else if (!form.elements.tel.value.trim()) msg = '연락처를 입력해 주세요.';
    else if (!form.elements.email.checkValidity() || !form.elements.email.value.trim()) msg = '이메일 주소를 올바르게 입력해 주세요.';
    else if (!form.elements.agree.checked) msg = '개인정보 수집·이용에 동의해 주세요.';
    errEl.hidden = !msg;
    errEl.textContent = msg;
    if (!msg) toastEl.hidden = false;
  });

  // ---------- 현재 섹션 내비게이션 표시 ----------
  var links = Array.prototype.slice.call(document.querySelectorAll('.nav a'));
  if ('IntersectionObserver' in window && links.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (l) { l.classList.toggle('active', l.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(function (l) {
      var t = document.querySelector(l.getAttribute('href'));
      if (t) io.observe(t);
    });
  }
})();
