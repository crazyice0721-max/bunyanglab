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

  // ---------- 문의 폼: /api/lead로 전송 ----------
  var errEl = document.getElementById('form-error');
  var toastEl = document.getElementById('form-toast');
  var submitBtn = form.querySelector('button[type="submit"]');

  function postJson(url, payload) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, data: j }; });
    });
  }

  function showFormError(msg) {
    errEl.hidden = !msg;
    errEl.textContent = msg || '';
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    toastEl.hidden = true;
    var f = form.elements;
    var services = Array.prototype.map.call(form.querySelectorAll('input[name="services"]:checked'), function (x) { return x.value; });
    var msg = '';
    if (!services.length) msg = '관심 서비스를 1개 이상 선택해 주세요.';
    else if (!f.name.value.trim()) msg = '성함 및 직함을 입력해 주세요.';
    else if (!f.tel.value.trim()) msg = '연락처를 입력해 주세요.';
    else if (!f.email.value.trim() || !f.email.checkValidity()) msg = '이메일 주소를 올바르게 입력해 주세요.';
    else if (!f.agree.checked) msg = '개인정보 수집·이용에 동의해 주세요.';
    showFormError(msg);
    if (msg) return;

    submitBtn.disabled = true;
    postJson('/api/lead', {
      services: services,
      state: f.state.value,
      name: f.name.value,
      company: f.office.value,
      phone: f.tel.value,
      email: f.email.value,
      message: f.message.value,
      agree: f.agree.checked,
      website: f.website.value
    }).then(function (r) {
      if (r.ok) {
        form.reset();
        toastEl.hidden = false;
      } else {
        showFormError(r.data.error || '접수 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.');
      }
    }).catch(function () {
      showFormError('네트워크 오류로 접수하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }).then(function () {
      submitBtn.disabled = false;
    });
  });

  // ---------- 상담 챗봇 ----------
  var chatLaunch = document.getElementById('chat-launch');
  var chatPanel = document.getElementById('chat-panel');
  var chatLog = document.getElementById('chat-log');
  var chatForm = document.getElementById('chat-form');
  var chatInput = document.getElementById('chat-input');
  var chatSend = document.getElementById('chat-send');
  var chatSuggest = document.getElementById('chat-suggest');
  var chatHistory = [];
  var chatBusy = false;
  var SUGGESTIONS = ['어떤 서비스가 있나요?', '쇼츠 편집 가격이 얼마인가요?', '제작 중 취소하면 환불되나요?', '수정은 몇 번까지 되나요?'];

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 3 | 8)).toString(16);
    });
  }
  function sessionId() {
    var id = null;
    try { id = sessionStorage.getItem('lab-chat-session'); } catch (e) {}
    if (!id) {
      id = newId();
      try { sessionStorage.setItem('lab-chat-session', id); } catch (e) {}
    }
    return id;
  }
  var chatSession = sessionId();

  function addMsg(kind, text, sources) {
    var m = el('div', 'msg msg-' + kind, text);
    if (sources && sources.length) {
      var box = el('div', 'msg-src');
      sources.forEach(function (s) {
        var parts = s.split('#');
        box.appendChild(el('span', 'chip', parts[0] === 'faq.md' ? parts[1] : (parts[1] || parts[0])));
      });
      m.appendChild(box);
    }
    chatLog.appendChild(m);
    chatLog.scrollTop = chatLog.scrollHeight;
    return m;
  }

  function renderSuggestions() {
    chatSuggest.textContent = '';
    SUGGESTIONS.forEach(function (q) {
      var b = el('button', 'chip filter', q);
      b.type = 'button';
      b.addEventListener('click', function () { ask(q); });
      chatSuggest.appendChild(b);
    });
  }

  function ask(text) {
    text = text.trim();
    if (!text || chatBusy) return;
    chatBusy = true;
    chatSend.disabled = true;
    chatSuggest.textContent = '';
    chatInput.value = '';
    addMsg('user', text);
    var wait = addMsg('bot msg-wait', '답변을 준비하고 있습니다…');
    postJson('/api/chat', { session_id: chatSession, message: text, history: chatHistory.slice(-6) })
      .then(function (r) {
        wait.remove();
        if (r.ok && r.data.answer) {
          addMsg('bot', r.data.answer, r.data.sources);
          chatHistory.push({ role: 'user', content: text }, { role: 'assistant', content: r.data.answer });
        } else {
          addMsg('error', r.data.error || '답변을 받지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
      })
      .catch(function () {
        wait.remove();
        addMsg('error', '네트워크 오류로 답변을 받지 못했습니다. 잠시 후 다시 시도해 주세요.');
      })
      .then(function () {
        chatBusy = false;
        chatSend.disabled = false;
        chatInput.focus();
      });
  }

  function openChat(open) {
    chatPanel.hidden = !open;
    chatLaunch.hidden = open;
    chatLaunch.setAttribute('aria-expanded', String(open));
    if (open) {
      if (!chatLog.children.length) {
        addMsg('bot', '안녕하세요, 분양LAB 챗봇입니다. 서비스, 가격, 진행 절차에 대해 물어보세요. 견적이 필요하시면 아래 상담 신청 양식을 이용해 주세요.');
        renderSuggestions();
      }
      chatInput.focus();
    } else {
      chatLaunch.focus();
    }
  }

  chatLaunch.addEventListener('click', function () { openChat(true); });
  document.getElementById('chat-close').addEventListener('click', function () { openChat(false); });
  chatPanel.addEventListener('keydown', function (e) { if (e.key === 'Escape') openChat(false); });
  chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    ask(chatInput.value);
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
