/* 예배PPT 관리 시스템 — 순수 JS, 서버 없음. 데이터는 localStorage에 저장. */
(function () {
  "use strict";
  var LS_WORSHIPS = "worshipPPT_worships_v1";
  var LS_LIBRARY = "worshipPPT_library_v1";
  var ORDER_KINDS = ["묵도", "기원", "찬송", "성시교독", "신앙고백", "대표기도", "성경봉독", "특별찬송", "말씀", "기도", "헌금", "봉헌기도", "교회소식", "축도", "인도"];

  function loadWorships() {
    try {
      var raw = localStorage.getItem(LS_WORSHIPS);
      if (raw) { var parsed = JSON.parse(raw); if (Array.isArray(parsed) && parsed.length) return parsed; }
    } catch (e) { /* 저장된 값이 깨졌으면 예시로 되돌림 */ }
    return JSON.parse(JSON.stringify(SAMPLE_WORSHIPS));
  }
  function loadLibrary() {
    try {
      var raw = localStorage.getItem(LS_LIBRARY);
      if (raw) { var parsed = JSON.parse(raw); if (parsed && typeof parsed === "object") return { hymns: parsed.hymns || [], responsive: parsed.responsive || [] }; }
    } catch (e) {}
    return { hymns: [], responsive: [] };
  }
  var worships = loadWorships();
  var library = loadLibrary();
  var selectedId = worships[0] ? worships[0].id : null;
  var editing = false;
  var editDraft = null;
  var presentSlides = [];
  var presentIndex = 0;
  var touchStartX = null;

  function saveWorships() { try { localStorage.setItem(LS_WORSHIPS, JSON.stringify(worships)); } catch (e) {} }
  function saveLibrary() { try { localStorage.setItem(LS_LIBRARY, JSON.stringify(library)); } catch (e) {} }
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function selectedWorship() {
    for (var i = 0; i < worships.length; i++) if (worships[i].id === selectedId) return worships[i];
    return worships[0] || null;
  }
  function hymnLabel(o) {
    var parts = [];
    if (o.hymnTong) parts.push("통" + o.hymnTong + "장");
    if (o.hymnSae) parts.push("새" + o.hymnSae + "장");
    if (o["교독Tong"]) parts.push("통" + o["교독Tong"] + "번");
    if (o["교독Sae"]) parts.push("새" + o["교독Sae"] + "번");
    return parts.join(" / ");
  }
  function orderTitle(o) {
    if (o.kind === "찬송" && o.hymnTong) return "찬송가 " + o.hymnTong + "장";
    if (o.kind === "성시교독" && o["교독Tong"]) return "성시교독 " + o["교독Tong"] + "번";
    if (o.kind === "성경봉독" && o.bible) return o.bible;
    if (o.kind === "말씀" && o.sermon) return o.sermon;
    if (o.detail) return o.detail;
    return o.kind;
  }
  function orderSub(o) {
    var bits = [];
    var h = hymnLabel(o);
    if (h) bits.push(h);
    if (o.bible) bits.push(o.bible);
    if (o.sermon) bits.push("설교: " + o.sermon);
    if (o.detail && o.kind !== "말씀") bits.push(o.detail);
    if (o.kind === "말씀" && o.detail) bits.push(o.detail);
    return bits.join(" · ");
  }
  function findHymnText(o) {
    if (!o.hymnTong) return "";
    for (var i = 0; i < library.hymns.length; i++) {
      if (String(library.hymns[i].no).indexOf(o.hymnTong) !== -1) return library.hymns[i].text;
    }
    return "";
  }
  function findRespText(o) {
    var n = o["교독Tong"];
    if (!n) return "";
    for (var i = 0; i < library.responsive.length; i++) {
      if (String(library.responsive[i].no).indexOf(n) !== -1) return library.responsive[i].text;
    }
    return "";
  }

  /* ---------- 탭 ---------- */
  var tabBtns = document.querySelectorAll("[data-tab]");
  function showTab(name) {
    tabBtns.forEach(function (b) {
      var on = b.getAttribute("data-tab") === name;
      b.setAttribute("aria-selected", on ? "true" : "false");
      if (on) b.removeAttribute("tabindex"); else b.setAttribute("tabindex", "-1");
      document.getElementById("panel-" + b.getAttribute("data-tab")).hidden = !on;
    });
    if (name === "present") renderPresent();
    if (name === "library") renderLibrary();
    if (name === "reference") renderReference();
  }
  tabBtns.forEach(function (b) { b.addEventListener("click", function () { showTab(b.getAttribute("data-tab")); }); });

  /* ---------- 예배 목록 + 상세 ---------- */
  function renderList() {
    var el = document.getElementById("worshipList");
    el.innerHTML = worships.map(function (w) {
      return '<button type="button" class="worship-item" data-id="' + esc(w.id) + '" aria-current="' + (w.id === selectedId) + '">' +
        '<span class="w-name">' + esc(w.name) + '</span>' +
        '<span class="w-time">' + esc(w.time || "") + (w.date ? " · " + esc(w.date) : "") + '</span>' +
        '<span class="w-leader">사회: ' + esc(w.leader || "") + '</span>' +
        (w.season ? '<span class="w-season">' + esc(w.season) + '</span>' : "") +
        '</button>';
    }).join("");
    el.querySelectorAll(".worship-item").forEach(function (btn) {
      btn.addEventListener("click", function () { selectedId = btn.getAttribute("data-id"); editing = false; renderList(); renderDetail(); syncPresentSelect(); });
    });
  }

  function renderDetail() {
    var box = document.getElementById("worshipDetail");
    var w = selectedWorship();
    if (!w) { box.innerHTML = '<div class="empty">예배가 없습니다. “새 예배 만들기”를 눌러 주세요.</div>'; return; }
    if (editing && editDraft) { renderEditForm(box, editDraft); return; }
    var rows = w.orders.map(function (o, i) {
      var sub = orderSub(o);
      var hymnText = o.kind === "찬송" ? findHymnText(o) : "";
      var respText = o.kind === "성시교독" ? findRespText(o) : "";
      var extra = "";
      if (hymnText) extra = '<div class="o-sub">가사 등록됨: ' + esc(hymnText.slice(0, 60)) + '…</div>';
      if (respText) extra = '<div class="o-sub">교독문 등록됨: ' + esc(respText.slice(0, 60)) + '…</div>';
      if (o.kind === "찬송" && !hymnText) extra = '<div class="o-sub">가사는 찬송가 책을 확인해 주세요</div>';
      return '<li>' +
        '<span class="order-num">' + (i + 1) + '</span>' +
        '<span class="order-kind">' + esc(o.kind) + '</span>' +
        '<span class="order-main"><span class="o-title">' + esc(orderTitle(o)) + '</span>' +
        (sub && sub !== orderTitle(o) ? '<span class="o-sub"> · ' + esc(sub) + '</span>' : "") + extra + '</span>' +
        '<span class="order-person">' + esc(o.person || "") + '</span></li>';
    }).join("");
    box.innerHTML =
      '<div class="detail-head"><h2>' + esc(w.name) + '</h2>' +
      '<div class="meta">' + esc(w.time || "") + (w.date ? " · " + esc(w.date) : "") + (w.season ? " · " + esc(w.season) : "") + ' · 사회: ' + esc(w.leader || "") + '</div>' +
      (w.motto ? '<p class="motto serif">“' + esc(w.motto) + '” <span class="motto-ref">(' + esc(w.mottoRef || "") + ')</span></p>' : "") +
      (w.note ? '<p class="note">' + esc(w.note) + '</p>' : "") +
      '</div>' +
      '<div class="detail-actions">' +
      '<button class="btn" type="button" data-ppt="full">PPT ① 순서 전체 받기</button>' +
      '<button class="btn btn--ghost" type="button" data-ppt="hymns">PPT ② 찬송가·찬양 받기</button>' +
      '<button class="btn btn--ghost" type="button" data-ppt="word">PPT ③ 말씀·교독문 받기</button>' +
      '<button class="btn btn--gold" type="button" id="editBtn">편집</button>' +
      '<button class="btn btn--ghost" type="button" id="presentBtn">송출로 보기</button>' +
      '</div>' +
      '<ol class="order-list">' + rows + '</ol>';
    box.querySelectorAll("[data-ppt]").forEach(function (b) {
      b.addEventListener("click", function () { downloadPPT(w, b.getAttribute("data-ppt")); });
    });
    document.getElementById("editBtn").addEventListener("click", function () {
      editing = true; editDraft = JSON.parse(JSON.stringify(w)); renderDetail();
    });
    document.getElementById("presentBtn").addEventListener("click", function () {
      syncPresentSelect(); showTab("present");
      document.getElementById("presentSearch").focus();
    });
  }

  function renderEditForm(box, d) {
    var orderHtml = d.orders.map(function (o, i) {
      return '<div class="order-edit" data-index="' + i + '">' +
        '<div class="row"><label>순서 종류<select data-f="kind">' + ORDER_KINDS.map(function (k) { return '<option' + (k === o.kind ? " selected" : "") + '>' + k + '</option>'; }).join("") + '</select></label>' +
        '<label>내용 / 제목<input data-f="detail" value="' + esc(o.detail || "") + '" placeholder="예: 주악, 사도신경"></label>' +
        '<label>담당자<input data-f="person" value="' + esc(o.person || "") + '" placeholder="예: 다 같이"></label></div>' +
        '<div class="row"><label>찬송 통 번호<input data-f="hymnTong" value="' + esc(o.hymnTong || "") + '" placeholder="예: 306"></label>' +
        '<label>찬송 새 번호<input data-f="hymnSae" value="' + esc(o.hymnSae || "") + '" placeholder="비어 있으면 빈칸"></label>' +
        '<label>교독 통 번호<input data-f="교독Tong" value="' + esc(o["교독Tong"] || "") + '" placeholder="예: 52"></label></div>' +
        '<div class="row row--wide"><label>성경 본문<input data-f="bible" value="' + esc(o.bible || "") + '" placeholder="예: 신16:13~17"></label>' +
        '<label>설교 제목<input data-f="sermon" value="' + esc(o.sermon || "") + '" placeholder="예: 진정한 감사절"></label></div>' +
        '<div><button class="btn btn--danger btn--small" type="button" data-del-order="' + i + '">이 순서 삭제</button></div></div>';
    }).join("");
    box.innerHTML =
      '<div class="detail-head"><h2>예배 편집 — ' + esc(d.name || "새 예배") + '</h2><p class="meta">바꾼 뒤 저장을 눌러야 저장됩니다.</p></div>' +
      '<form class="edit-form" id="editForm">' +
      '<div class="row"><label>예배 이름<input id="ef-name" value="' + esc(d.name || "") + '" required></label>' +
      '<label>시간<input id="ef-time" value="' + esc(d.time || "") + '" placeholder="예: 오전 10:30"></label></div>' +
      '<div class="row"><label>날짜<input id="ef-date" value="' + esc(d.date || "") + '" placeholder="예: 2026-11-22"></label>' +
      '<label>절기<input id="ef-season" value="' + esc(d.season || "") + '" placeholder="예: 추수감사절"></label></div>' +
      '<div class="row"><label>사회자<input id="ef-leader" value="' + esc(d.leader || "") + '"></label>' +
      '<label>표어 출처<input id="ef-mottoRef" value="' + esc(d.mottoRef || "") + '" placeholder="예: 요4:24"></label></div>' +
      '<label>표어<textarea id="ef-motto">' + esc(d.motto || "") + '</textarea></label>' +
      '<label>안내 문구<input id="ef-note" value="' + esc(d.note || "") + '" placeholder="예: ※표는 일어서세요"></label>' +
      '<div><strong>순서 (' + d.orders.length + '개)</strong></div>' + orderHtml +
      '<div class="form-actions"><button class="btn btn--ghost" type="button" id="addOrderBtn">+ 순서 추가</button></div>' +
      '<div class="form-actions"><button class="btn" type="submit">저장</button>' +
      '<button class="btn btn--ghost" type="button" id="cancelEditBtn">취소</button>' +
      '<button class="btn btn--danger" type="button" id="deleteWorshipBtn">이 예배 삭제</button></div>' +
      '</form>';
    document.getElementById("addOrderBtn").addEventListener("click", function () {
      collectEditForm(); d.orders.push({ kind: "찬송", detail: "", person: "다 같이" }); renderDetail();
    });
    box.querySelectorAll("[data-del-order]").forEach(function (b) {
      b.addEventListener("click", function () { collectEditForm(); d.orders.splice(Number(b.getAttribute("data-del-order")), 1); renderDetail(); });
    });
    document.getElementById("cancelEditBtn").addEventListener("click", function () { editing = false; editDraft = null; renderDetail(); });
    document.getElementById("deleteWorshipBtn").addEventListener("click", function () {
      if (!confirm("이 예배를 삭제할까요?")) return;
      worships = worships.filter(function (x) { return x.id !== d.id; });
      selectedId = worships[0] ? worships[0].id : null; editing = false; editDraft = null;
      saveWorships(); renderList(); renderDetail(); syncPresentSelect();
    });
    document.getElementById("editForm").addEventListener("submit", function (e) {
      e.preventDefault(); collectEditForm();
      var idx = worships.findIndex(function (x) { return x.id === d.id; });
      if (idx >= 0) worships[idx] = d; else worships.push(d);
      selectedId = d.id; editing = false; editDraft = null;
      saveWorships(); renderList(); renderDetail(); syncPresentSelect();
      alert("저장했습니다.");
    });
    function collectEditForm() {
      d.name = document.getElementById("ef-name").value.trim();
      d.time = document.getElementById("ef-time").value.trim();
      d.date = document.getElementById("ef-date").value.trim();
      d.season = document.getElementById("ef-season").value.trim();
      d.leader = document.getElementById("ef-leader").value.trim();
      d.mottoRef = document.getElementById("ef-mottoRef").value.trim();
      d.motto = document.getElementById("ef-motto").value.trim();
      d.note = document.getElementById("ef-note").value.trim();
      box.querySelectorAll(".order-edit").forEach(function (el) {
        var i = Number(el.getAttribute("data-index"));
        el.querySelectorAll("[data-f]").forEach(function (inp) { d.orders[i][inp.getAttribute("data-f")] = inp.value.trim(); });
      });
    }
  }

  document.getElementById("newWorshipBtn").addEventListener("click", function () {
    var nw = { id: "w-" + Date.now(), name: "새 예배", time: "", season: "", leader: "", date: "", motto: "", mottoRef: "", note: "", orders: [{ kind: "찬송", detail: "", person: "다 같이" }] };
    worships.push(nw); selectedId = nw.id; editing = true; editDraft = JSON.parse(JSON.stringify(nw));
    saveWorships(); renderList(); renderDetail();
  });
  document.getElementById("resetBtn").addEventListener("click", function () {
    if (!confirm("주보 예시 4개 예배로 되돌릴까요? 바꾼 내용은 사라집니다.")) return;
    worships = JSON.parse(JSON.stringify(SAMPLE_WORSHIPS));
    selectedId = worships[0].id; editing = false; saveWorships(); renderList(); renderDetail(); syncPresentSelect();
  });

  /* ---------- PPT 3종 ---------- */
  function pptxFileName(w, label) {
    var base = (w.name || "예배").replace(/[\\/:*?"<>|]/g, "");
    return base + "_" + label + ".pptx";
  }
  function addTitleSlide(pptx, w, label) {
    var s = pptx.addSlide();
    s.background = { color: "1E2A4A" };
    s.addText(w.name, { x: 0.6, y: 1.4, w: 12.1, h: 1.1, fontSize: 40, bold: true, color: "FFFFFF", align: "center" });
    s.addText(label, { x: 0.6, y: 2.6, w: 12.1, h: 0.6, fontSize: 20, color: "D9C48A", align: "center" });
    s.addText([w.time || "", w.season || "", w.leader ? "사회: " + w.leader : ""].filter(Boolean).join(" · "), { x: 0.6, y: 3.3, w: 12.1, h: 0.5, fontSize: 16, color: "C8CDD9", align: "center" });
    if (w.motto) s.addText("“" + w.motto + "” (" + (w.mottoRef || "") + ")", { x: 1.2, y: 4.1, w: 10.9, h: 1.0, fontSize: 16, italic: true, color: "FFFFFF", align: "center" });
  }
  function addOrderSlide(pptx, o, idx, total) {
    var s = pptx.addSlide();
    s.background = { color: "FFFFFF" };
    s.addText(o.kind, { x: 0.6, y: 0.5, w: 12.1, h: 0.5, fontSize: 18, bold: true, color: "A8894E" });
    s.addText(orderTitle(o), { x: 0.6, y: 1.2, w: 12.1, h: 1.2, fontSize: 36, bold: true, color: "1E2A4A" });
    var lines = [];
    var sub = orderSub(o);
    if (sub) lines.push(sub);
    if (o.person) lines.push("담당: " + o.person);
    if (o.kind === "찬송") {
      var t = findHymnText(o);
      lines.push(t ? t : "가사는 찬송가 책을 확인해 주세요");
    }
    if (o.kind === "성시교독") {
      var r = findRespText(o);
      lines.push(r ? r : "교독문 전문은 교독문 책을 확인해 주세요");
    }
    if (o.kind === "성경봉독") lines.push("개역개정 초안 — 예배 전 확인해 주세요");
    if (lines.length) s.addText(lines.join("\n"), { x: 0.6, y: 2.6, w: 12.1, h: 2.6, fontSize: 18, color: "333333" });
    s.addText((idx + 1) + " / " + total, { x: 11.6, y: 6.9, w: 1.1, h: 0.4, fontSize: 12, color: "999999", align: "right" });
  }
  function downloadPPT(w, type) {
    if (typeof window.PptxGenJS === "undefined") { alert("PPT 생성 도구(PptxGenJS)를 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 열어 주세요."); return; }
    var pptx = new window.PptxGenJS();
    pptx.defineLayout({ name: "WIDE", width: 13.33, height: 7.5 });
    pptx.layout = "WIDE";
    pptx.author = "예배PPT 관리 시스템";
    var label = "", list = [];
    if (type === "full") { label = "예배 순서 전체"; list = w.orders; }
    if (type === "hymns") { label = "찬송가·찬양"; list = w.orders.filter(function (o) { return o.kind === "찬송" || o.kind === "특별찬송"; }); }
    if (type === "word") { label = "말씀·교독문"; list = w.orders.filter(function (o) { return ["성경봉독", "말씀", "성시교독", "신앙고백"].indexOf(o.kind) !== -1; }); }
    addTitleSlide(pptx, w, label);
    if (!list.length) {
      var s = pptx.addSlide(); s.background = { color: "FFFFFF" };
      s.addText("해당 순서가 없습니다", { x: 0.6, y: 2.5, w: 12.1, h: 1, fontSize: 28, bold: true, color: "1E2A4A", align: "center" });
    } else {
      list.forEach(function (o, i) { addOrderSlide(pptx, o, i, list.length); });
    }
    pptx.writeFile({ fileName: pptxFileName(w, label) }).catch(function () { alert("PPT 저장에 실패했습니다. 브라우저에서 다운로드를 허용해 주세요."); });
  }

  /* ---------- 송출 ---------- */
  function syncPresentSelect() {
    var sel = document.getElementById("presentWorshipSelect");
    sel.innerHTML = worships.map(function (w) { return '<option value="' + esc(w.id) + '">' + esc(w.name) + ' — ' + esc(w.time || "") + '</option>'; }).join("");
    if (selectedId) sel.value = selectedId;
  }
  function buildPresentSlides() {
    var w = null;
    var sel = document.getElementById("presentWorshipSelect");
    for (var i = 0; i < worships.length; i++) if (worships[i].id === sel.value) w = worships[i];
    if (!w) w = selectedWorship();
    var q = (document.getElementById("presentSearch").value || "").trim().toLowerCase();
    var all = (w ? w.orders : []).map(function (o, i) { return { order: o, num: i + 1, worship: w }; });
    if (!q) return all;
    return all.filter(function (item) {
      var o = item.order;
      var hay = [o.kind, orderTitle(o), orderSub(o), o.person || "", o.bible || "", o.sermon || "", o.hymnTong || "", o.detail || ""].join(" ").toLowerCase();
      // "찬송가 306" -> "찬송" + "306" 둘 다 포함되면 통과
      var words = q.split(/\s+/).filter(Boolean).map(function (x) { return x.replace("찬송가", "찬송"); });
      return words.every(function (wd) { return hay.indexOf(wd) !== -1; });
    });
  }
  function renderPresent() {
    syncPresentSelect();
    presentSlides = buildPresentSlides();
    var el = document.getElementById("slideResults");
    if (!presentSlides.length) { el.innerHTML = '<li class="empty">검색 결과가 없습니다. 검색어를 지우면 전체 순서를 볼 수 있습니다.</li>'; return; }
    el.innerHTML = presentSlides.map(function (item, i) {
      var o = item.order;
      return '<li><button type="button" data-present="' + i + '">' +
        '<span class="order-num">' + item.num + '</span>' +
        '<span class="s-kind">' + esc(o.kind) + '</span>' +
        '<span class="order-main"><span class="o-title">' + esc(orderTitle(o)) + '</span>' +
        (orderSub(o) ? '<span class="o-sub"> · ' + esc(orderSub(o)) + '</span>' : "") + '</span>' +
        '<span class="order-person">' + esc(o.person || "") + '</span></button></li>';
    }).join("");
    el.querySelectorAll("[data-present]").forEach(function (b) {
      b.addEventListener("click", function () { openPresent(Number(b.getAttribute("data-present"))); });
    });
  }
  document.getElementById("presentWorshipSelect").addEventListener("change", renderPresent);
  document.getElementById("presentSearch").addEventListener("input", renderPresent);

  function openPresent(i) {
    presentIndex = i;
    showPresentSlide();
    document.getElementById("presentOverlay").hidden = false;
    document.body.style.overflow = "hidden";
    document.getElementById("presentClose").focus();
  }
  function closePresent() {
    document.getElementById("presentOverlay").hidden = true;
    document.body.style.overflow = "";
  }
  function showPresentSlide() {
    var item = presentSlides[presentIndex];
    if (!item) return;
    var o = item.order;
    document.getElementById("presentKind").textContent = o.kind + "  ·  " + item.num + " / " + presentSlides.length;
    document.getElementById("presentTitle").textContent = orderTitle(o);
    var sub = orderSub(o);
    var extra = "";
    if (o.kind === "찬송") extra = findHymnText(o) || "가사는 찬송가 책을 확인해 주세요";
    if (o.kind === "성시교독") extra = findRespText(o) || "교독문 전문은 교독문 책을 확인해 주세요";
    if (o.kind === "성경봉독") extra = "개역개정 초안 — 예배 전 확인해 주세요";
    document.getElementById("presentSub").textContent = [sub, extra].filter(Boolean).join("\n");
    document.getElementById("presentPerson").textContent = o.person || "";
    document.getElementById("presentCount").textContent = item.worship.name + "  ·  " + (presentIndex + 1) + " / " + presentSlides.length;
  }
  function presentNext() { if (presentIndex < presentSlides.length - 1) { presentIndex++; showPresentSlide(); } }
  function presentPrev() { if (presentIndex > 0) { presentIndex--; showPresentSlide(); } }
  document.getElementById("presentClose").addEventListener("click", closePresent);
  document.addEventListener("keydown", function (e) {
    var ov = document.getElementById("presentOverlay");
    if (ov.hidden) return;
    if (e.key === "Escape") closePresent();
    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); presentNext(); }
    if (e.key === "ArrowLeft") { e.preventDefault(); presentPrev(); }
  });
  document.getElementById("presentOverlay").addEventListener("click", function (e) {
    if (e.target.id === "presentClose") return;
    if (e.clientX > window.innerWidth * 0.6) presentNext();
    else if (e.clientX < window.innerWidth * 0.4) presentPrev();
  });
  document.getElementById("presentOverlay").addEventListener("touchstart", function (e) { touchStartX = e.changedTouches[0].clientX; }, { passive: true });
  document.getElementById("presentOverlay").addEventListener("touchend", function (e) {
    if (touchStartX == null) return;
    var dx = e.changedTouches[0].clientX - touchStartX;
    if (dx < -40) presentNext();
    if (dx > 40) presentPrev();
    touchStartX = null;
  }, { passive: true });

  /* ---------- 자료실 ---------- */
  function renderLibrary() {
    var hl = document.getElementById("hymnList");
    hl.innerHTML = library.hymns.length ? library.hymns.map(function (h, i) {
      return '<li><div><strong>' + esc(h.no) + (h.title ? " — " + esc(h.title) : "") + '</strong><div class="lib-text">' + esc(h.text) + '</div></div><button class="btn btn--danger btn--small" type="button" data-del-hymn="' + i + '">삭제</button></li>';
    }).join("") : '<li><div>아직 등록된 찬송가 가사가 없습니다. 직접 등록해 주세요.</div></li>';
    var rl = document.getElementById("respList");
    rl.innerHTML = library.responsive.length ? library.responsive.map(function (r, i) {
      return '<li><div><strong>' + esc(r.no) + (r.ref ? " — " + esc(r.ref) : "") + '</strong><div class="lib-text">' + esc(r.text) + '</div></div><button class="btn btn--danger btn--small" type="button" data-del-resp="' + i + '">삭제</button></li>';
    }).join("") : '<li><div>아직 등록된 교독문이 없습니다. 직접 등록해 주세요.</div></li>';
    hl.querySelectorAll("[data-del-hymn]").forEach(function (b) { b.addEventListener("click", function () { library.hymns.splice(Number(b.getAttribute("data-del-hymn")), 1); saveLibrary(); renderLibrary(); renderDetail(); }); });
    rl.querySelectorAll("[data-del-resp]").forEach(function (b) { b.addEventListener("click", function () { library.responsive.splice(Number(b.getAttribute("data-del-resp")), 1); saveLibrary(); renderLibrary(); renderDetail(); }); });
  }
  document.getElementById("hymnForm").addEventListener("submit", function (e) {
    e.preventDefault();
    library.hymns.push({ no: document.getElementById("hymnNo").value.trim(), title: document.getElementById("hymnTitle").value.trim(), text: document.getElementById("hymnText").value.trim() });
    saveLibrary(); e.target.reset(); renderLibrary();
  });
  document.getElementById("responsiveForm").addEventListener("submit", function (e) {
    e.preventDefault();
    library.responsive.push({ no: document.getElementById("respNo").value.trim(), ref: document.getElementById("respRef").value.trim(), text: document.getElementById("respText").value.trim() });
    saveLibrary(); e.target.reset(); renderLibrary();
  });

  /* ---------- 참고표 ---------- */
  function renderReference() {
    var box = document.getElementById("referenceTables");
    box.innerHTML = Object.keys(REFERENCE_TABLES).map(function (key) {
      var t = REFERENCE_TABLES[key];
      var head = "<tr>" + t.headers.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") + "</tr>";
      var rows = t.rows.map(function (r) { return "<tr>" + r.map(function (c) { return "<td>" + esc(c) + "</td>"; }).join("") + "</tr>"; }).join("");
      return '<div class="ref-block"><h3>' + esc(t.title) + '</h3><div class="table-scroll"><table><thead>' + head + '</thead><tbody>' + rows + '</tbody></table></div>' +
        (t.footnote ? '<p class="footnote">' + esc(t.footnote) + '</p>' : "") + '</div>';
    }).join("");
  }

  /* ---------- 시작 ---------- */
  renderList();
  renderDetail();
  syncPresentSelect();
  renderPresent();
  renderLibrary();
  renderReference();
})();
