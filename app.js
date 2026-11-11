// ============================================================
// Забота: давление и пульс — Версия 1.0 (Блокнот + СМС)
// ============================================================

let records = [];
let currentInput = null;
let editingId = null;
let currentRecordType = null;
let currentOnboardingSlide = 1;
let targetSys = 120;
let targetDia = 80;
let currentFilter = 'all';

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  loadData();
  applyTheme();
  checkTerms();
  setupEventListeners();
  renderRecords();
  applyFontSize();
  checkUrlShortcuts();
});

function loadData() {
  const savedRecords = localStorage.getItem('zabota_records');
  if (savedRecords) records = JSON.parse(savedRecords);
  
  let profile = JSON.parse(localStorage.getItem('zabota_profile') || '{}');
  
  // Сброс безумной нормы
  if ((profile.targetSys && profile.targetSys > 300) || (profile.targetDia && profile.targetDia > 200)) {
    profile.targetSys = 120; profile.targetDia = 80;
    localStorage.setItem('zabota_profile', JSON.stringify(profile));
  }

  if (profile.fullName) $('inpFullName').value = profile.fullName;
  if (profile.doctorName) $('inpDoctorName').value = profile.doctorName;
  if (profile.doctorPhone) $('inpDoctorPhone').value = profile.doctorPhone;
  if (profile.familyPhone) $('inpFamilyPhone').value = profile.familyPhone;
  
  if (profile.targetSys) targetSys = parseInt(profile.targetSys);
  if (profile.targetDia) targetDia = parseInt(profile.targetDia);
  $('inpTargetSys').value = targetSys;
  $('inpTargetDia').value = targetDia;

  $('chkLargeFont').checked = localStorage.getItem('zabota_large_font') === 'true';
  $('chkDarkMode').checked = localStorage.getItem('zabota_dark_mode') === 'true';
}

function checkTerms() {
  const accepted = localStorage.getItem('zabota_terms');
  const onboarded = localStorage.getItem('zabota_onboarded');
  if (!accepted) {
    $('termsScreen').hidden = false; $('onboardingScreen').hidden = true; $('app').hidden = true;
  } else if (!onboarded) {
    $('termsScreen').hidden = true; $('onboardingScreen').hidden = false; $('app').hidden = true;
  } else {
    $('termsScreen').hidden = true; $('onboardingScreen').hidden = true; $('app').hidden = false;
    updateTrafficLight();
  }
}

function checkUrlShortcuts() {
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  if (localStorage.getItem('zabota_onboarded') === 'true' && localStorage.getItem('zabota_terms') === 'true') {
    if (action === 'add_pressure') setTimeout(() => openRecordModal('pressure'), 300);
    else if (action === 'add_sugar') setTimeout(() => openRecordModal('sugar'), 300);
  }
}

function nextOnboardingSlide() {
  if (currentOnboardingSlide === 1) {
    $('slide1').hidden = true; $('slide2').hidden = false; $('dot1').classList.remove('active'); $('dot2').classList.add('active'); currentOnboardingSlide = 2;
  } else if (currentOnboardingSlide === 2) {
    $('slide2').hidden = true; $('slide3').hidden = false; $('dot2').classList.remove('active'); $('dot3').classList.add('active'); $('btnOnboardingNext').textContent = 'НАЧАТЬ!'; currentOnboardingSlide = 3;
  } else {
    localStorage.setItem('zabota_onboarded', 'true'); $('onboardingScreen').hidden = true; $('app').hidden = false; updateTrafficLight();
  }
}

function updateTrafficLight() {
  const tlCircle = $('tlCircle'); const tlText = $('tlText');
  const pressureRecords = records.filter(r => r.type === 'pressure').sort((a,b) => b.date - a.date);
  if (pressureRecords.length === 0) { tlCircle.className = 'traffic-light-circle'; tlText.textContent = 'Нет данных для оценки'; return; }
  const last = pressureRecords[0];
  let state = 'state-ok'; let text = 'Давление в норме';
  if (last.sys >= targetSys + 30 || last.dia >= targetDia + 20 || last.sys >= 160 || last.dia >= 100) { state = 'state-danger'; text = 'ОПАСНО ВЫСОКОЕ ДАВЛЕНИЕ'; }
  else if (last.sys <= 90 || last.dia <= 60) { state = 'state-danger'; text = 'ОПАСНО НИЗКОЕ ДАВЛЕНИЕ'; }
  else if (last.sys > targetSys + 10 || last.dia > targetDia + 5) { state = 'state-warn'; text = 'Давление немного повышено'; }
  tlCircle.className = `traffic-light-circle ${state}`; tlText.textContent = text;
}

function applyTheme() { document.body.classList.toggle('dark-mode', localStorage.getItem('zabota_dark_mode') === 'true'); }
function applyFontSize() { document.body.classList.toggle('large-font', localStorage.getItem('zabota_large_font') === 'true'); }

function saveProfile() {
  const profile = {
    fullName: $('inpFullName').value.trim(), doctorName: $('inpDoctorName').value.trim(),
    doctorPhone: $('inpDoctorPhone').value.trim(), familyPhone: $('inpFamilyPhone').value.trim(),
    targetSys: parseInt($('inpTargetSys').value) || 120, targetDia: parseInt($('inpTargetDia').value) || 80
  };
  if (profile.targetSys > 300 || profile.targetDia > 200) { alert('Слишком высокие значения нормы! Верхнее не более 300, нижнее не более 200.'); return; }
  localStorage.setItem('zabota_profile', JSON.stringify(profile));
  targetSys = profile.targetSys; targetDia = profile.targetDia;
  localStorage.setItem('zabota_large_font', $('chkLargeFont').checked);
  localStorage.setItem('zabota_dark_mode', $('chkDarkMode').checked);
  applyFontSize(); applyTheme(); updateTrafficLight();
  alert('Профиль сохранен!'); $('modalProfile').hidden = true;
}

function setupEventListeners() {
  $('btnAcceptTerms').addEventListener('click', () => { localStorage.setItem('zabota_terms', 'true'); checkTerms(); });
  $('btnOnboardingNext').addEventListener('click', nextOnboardingSlide);
  $('btnMenu').addEventListener('click', openDrawer);
  $('btnCloseDrawer').addEventListener('click', closeDrawer);
  $('drawerOverlay').addEventListener('click', closeDrawer);
  document.querySelectorAll('.drawer-item').forEach(btn => { btn.addEventListener('click', (e) => handleMenuAction(e.currentTarget.dataset.action)); });
  $('btnSos').addEventListener('click', () => $('modalSos').hidden = false);
  $('btnCallFamily').addEventListener('click', () => callPhone('inpFamilyPhone', 'родственника'));
  $('btnSosSms').addEventListener('click', sendSosSms);
  $('btnCallDoctor').addEventListener('click', () => callPhone('inpDoctorPhone', 'врача'));
  $('btnWarningCallFamily').addEventListener('click', () => callPhone('inpFamilyPhone', 'родственника'));
  $('btnWarningCallDoctor').addEventListener('click', () => callPhone('inpDoctorPhone', 'врача'));
  $('btnAddPressure').addEventListener('click', () => openRecordModal('pressure'));
  $('btnAddSugar').addEventListener('click', () => openRecordModal('sugar'));
  document.querySelectorAll('[data-close]').forEach(btn => { btn.addEventListener('click', (e) => $(e.currentTarget.dataset.close).hidden = true); });
  $('btnSaveProfile').addEventListener('click', saveProfile);
  document.querySelectorAll('.keypad').forEach(kp => kp.addEventListener('click', handleKeypadClick));
  ['inpSys', 'inpDia', 'inpPulse', 'inpSugar'].forEach(id => {
    $(id).addEventListener('focus', (e) => setActiveInput(e.target)); $(id).addEventListener('click', (e) => setActiveInput(e.target));
  });
  $('searchInput').addEventListener('input', renderRecords);
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active')); e.currentTarget.classList.add('active'); currentFilter = e.currentTarget.dataset.filter; renderRecords();
    });
  });
}

function showConfirm(title, text, btnText, btnColor, onConfirm) {
  $('confirmTitle').textContent = title;
  $('confirmText').textContent = text;
  const btnYes = $('btnConfirmYes'); const btnNo = $('btnConfirmNo');
  btnYes.textContent = btnText;
  btnYes.className = `btn btn-block ${btnColor}`;
  const newBtnYes = btnYes.cloneNode(true); const newBtnNo = btnNo.cloneNode(true);
  btnYes.parentNode.replaceChild(newBtnYes, btnYes); btnNo.parentNode.replaceChild(newBtnNo, btnNo);
  newBtnYes.addEventListener('click', () => { $('modalConfirm').hidden = true; onConfirm(); });
  newBtnNo.addEventListener('click', () => { $('modalConfirm').hidden = true; });
}

function callPhone(inputId, personName) { const phone = $(inputId).value; if (phone) window.location.href = `tel:${phone}`; else alert(`Сначала укажите телефон ${personName} в профиле.`); }
function openDrawer() { $('sideDrawer').classList.add('open'); $('drawerOverlay').classList.add('open'); }
function closeDrawer() { $('sideDrawer').classList.remove('open'); $('drawerOverlay').classList.remove('open'); }

function handleMenuAction(action) {
  closeDrawer();
  if (action === 'profile') $('modalProfile').hidden = false;
  if (action === 'privacy') $('modalPrivacy').hidden = false;
  if (action === 'termsofuse') $('modalTermsOfUse').hidden = false;
  if (action === 'clear') {
    if (confirm('ВНИМАНИЕ! Все записи будут удалены навсегда. Продолжить?')) {
      localStorage.removeItem('zabota_records'); records = []; renderRecords(); updateTrafficLight(); alert('Все данные удалены.');
    }
  }
}

function sendSosSms() {
  const profile = JSON.parse(localStorage.getItem('zabota_profile') || '{}');
  const phone = profile.familyPhone; 
  if (!phone) return alert('Сначала укажите номер родственника в профиле.');
  const lastPressure = records.find(r => r.type === 'pressure'); 
  const pressureText = lastPressure ? `${lastPressure.sys}/${lastPressure.dia}` : 'неизвестно';
  const text = `🚨 СРОЧНО! Мне нужна помощь. Мое последнее давление: ${pressureText}. Перезвони мне!`;
  showConfirm('Отправка', 'Отправить СМС родственнику?', 'Отправить', 'btn-primary', () => {
    window.location.href = `sms:${phone}?body=${encodeURIComponent(text)}`;
  });
}

function getCurrentDateTimeForInput() { const now = new Date(); now.setMinutes(now.getMinutes() - now.getTimezoneOffset()); return now.toISOString().slice(0, 16); }
function timestampToInputFormat(timestamp) { const d = new Date(timestamp); d.setMinutes(d.getMinutes() - d.getTimezoneOffset()); return d.toISOString().slice(0, 16); }

function openRecordModal(type) {
  currentRecordType = type; editingId = null; setActiveInput(null);
  $('inpSys').value = ''; $('inpDia').value = ''; $('inpPulse').value = ''; $('inpSugar').value = ''; $('chkFasting').checked = false;
  const nowStr = getCurrentDateTimeForInput(); $('inpDateTime').value = nowStr; $('inpDateTimeSugar').value = nowStr;
  if (type === 'pressure') { $('modalPressure').hidden = false; setActiveInput($('inpSys')); } else { $('modalSugar').hidden = false; setActiveInput($('inpSugar')); }
}

function setActiveInput(inputElement) {
  if (!inputElement) { document.querySelectorAll('.num-input').forEach(el => el.classList.remove('active')); currentInput = null; return; }
  document.querySelectorAll('.num-input').forEach(el => el.classList.remove('active')); inputElement.classList.add('active'); currentInput = inputElement;
}

function handleKeypadClick(e) {
  const btn = e.target.closest('.key'); if (!btn || !currentInput) return;
  const key = btn.dataset.key;
  if (key === 'done') { saveRecord(); return; }
  if (key === 'back') { currentInput.value = currentInput.value.slice(0, -1); return; }
  if (key === '.') { if (currentInput.value.includes('.')) return; if (currentInput.value.length === 0) currentInput.value = '0'; currentInput.value += '.'; return; }
  let newValue = currentInput.value + key;
  if (currentInput.id === 'inpSugar') { if (newValue.length > 4 || parseFloat(newValue) > 35.0) return; }
  else { if (newValue.length > 3) return; const val = parseInt(newValue); if (currentInput.id === 'inpSys' && val > 300) return; if (currentInput.id === 'inpDia' && val > 200) return; if (currentInput.id === 'inpPulse' && val > 250) return; }
  if (currentInput.value === '0' && key !== '.') currentInput.value = key; else currentInput.value += key;
}

function saveRecord() {
  const dateVal = $('inpDateTime').value || $('inpDateTimeSugar').value;
  const recordDate = dateVal ? new Date(dateVal).getTime() : Date.now();
  if (currentRecordType === 'pressure') {
    const sys = parseInt($('inpSys').value), dia = parseInt($('inpDia').value), pulse = parseInt($('inpPulse').value);
    if (!sys || !dia) { alert('Пожалуйста, введите Верхнее и Нижнее давление.'); return; }
    if (sys < 50 || sys > 300) { alert('Верхнее давление должно быть от 50 до 300.'); return; }
    if (dia < 30 || dia > 200) { alert('Нижнее давление должно быть от 30 до 200.'); return; }
    if (pulse > 0 && (pulse < 30 || pulse > 250)) { alert('Пульс должен быть от 30 до 250.'); return; }
    const record = { id: editingId || Date.now().toString(), type: 'pressure', sys, dia, pulse: pulse || 0, date: recordDate };
    saveRecordToArray(record); $('modalPressure').hidden = true;
    if (sys >= 160 || sys <= 100 || dia >= 100 || dia <= 60) { $('warningText').textContent = `Ваше давление ${sys}/${dia} сильно отличается от нормы. Если вы чувствуете себя плохо — обратитесь к врачу или позвоните в скорую!`; $('modalWarning').hidden = false; }
  } 
  else if (currentRecordType === 'sugar') {
    const sugar = parseFloat($('inpSugar').value), fasting = $('chkFasting').checked;
    if (!sugar) { alert('Введите уровень сахара.'); return; }
    if (sugar < 1.0 || sugar > 35.0) { alert('Сахар должен быть от 1.0 до 35.0.'); return; }
    const record = { id: editingId || Date.now().toString(), type: 'sugar', sugar, fasting, date: recordDate };
    saveRecordToArray(record); $('modalSugar').hidden = true;
  }
}

function saveRecordToArray(record) {
  if (editingId) { const idx = records.findIndex(r => r.id === editingId); if (idx > -1) records[idx] = record; }
  else records.push(record);
  records.sort((a, b) => b.date - a.date); localStorage.setItem('zabota_records', JSON.stringify(records));
  renderRecords(); updateTrafficLight();
}

function renderRecords() {
  const list = $('recordsList');
  const query = $('searchInput').value.toLowerCase().trim();
  $('recordsCounter').textContent = `${records.length}`;
  let filteredRecords = records;
  if (currentFilter === 'pressure') filteredRecords = filteredRecords.filter(r => r.type === 'pressure');
  if (currentFilter === 'sugar') filteredRecords = filteredRecords.filter(r => r.type === 'sugar');
  if (query) {
    const qNoSep = query.replace(/[\/\s.,-]/g, ''); 
    filteredRecords = filteredRecords.filter(r => {
      const monthStr = new Date(r.date).toLocaleString('ru-RU', {month: 'long', year: 'numeric'}).toLowerCase();
      const dateStr = new Date(r.date).toLocaleDateString('ru-RU'); 
      if (r.type === 'pressure') {
        const exactPressure = `${r.sys}/${r.dia}`; const combinedPressure = `${r.sys}${r.dia}`; 
        return String(r.sys).includes(query) || String(r.dia).includes(query) || String(r.pulse).includes(query) || exactPressure.includes(query) || combinedPressure.includes(qNoSep) || monthStr.includes(query) || dateStr.includes(query);
      } else { return String(r.sugar).includes(query) || monthStr.includes(query) || dateStr.includes(query); }
    });
  }
  if (filteredRecords.length === 0) { list.innerHTML = '<div class="empty">Ничего не найдено.</div>'; return; }
  const groups = {};
  filteredRecords.forEach(r => {
    const d = new Date(r.date); const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!groups[key]) groups[key] = []; groups[key].push(r);
  });
  const sortedKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  let html = '';
  sortedKeys.forEach((key, index) => {
    const [year, month] = key.split('-');
    const monthName = new Date(year, month - 1, 1).toLocaleString('ru-RU', {month: 'long'});
    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const groupRecords = groups[key]; const isOpen = (index === 0 && !query) ? 'open' : (query ? 'open' : '');
    html += `<div class="month-group ${isOpen}"><div class="month-header" onclick="toggleMonth(this)"><span>${capitalizedMonth} ${year} (${groupRecords.length})</span><span class="month-arrow">▼</span></div><div class="month-content">${groupRecords.map(r => renderRecordCard(r)).join('')}</div></div>`;
  });
  list.innerHTML = html;
}

window.toggleMonth = function(header) { header.parentElement.classList.toggle('open'); };

function renderRecordCard(r) {
  const dateStr = new Date(r.date).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  let stateClass = 'state-ok'; let content = '';
  if (r.type === 'pressure') {
    if (r.sys >= 140 || r.dia >= 90) stateClass = 'state-danger'; else if (r.sys >= 130 || r.dia >= 85) stateClass = 'state-warn';
    content = `<div class="record-pressure-values"><span class="record-big-number">${r.sys}/${r.dia}</span><span class="record-pulse-text">Пульс: ${r.pulse}</span></div>`;
  } else {
    if (r.sugar >= 7.0) stateClass = 'state-danger'; else if (r.sugar >= 6.1) stateClass = 'state-warn';
    content = `<div class="record-sugar-values"><span class="record-sugar-number">Сахар: ${r.sugar}</span>${r.fasting ? '<span class="record-sugar-fasting">Натощак</span>' : ''}</div>`;
  }
  return `<div class="record-card ${stateClass}"><div class="record-main">${content}<div class="record-date">${dateStr}</div></div><div class="record-actions"><button class="action-btn-text" onclick="editRecord('${r.id}')">✏️ Изменить</button><button class="action-btn-text" onclick="sendSMS('${r.id}')">✉️ СМС</button><button class="action-btn-text" onclick="deleteRecord('${r.id}')">🗑 Удалить</button></div></div>`;
}

window.sendSMS = function(id) {
  const record = records.find(r => r.id === id);
  if (!record) return;
  const profile = JSON.parse(localStorage.getItem('zabota_profile') || '{}');
  const phone = profile.familyPhone;
  if (!phone) { alert('Укажите номер родственника в настройках профиля.'); return; }
  const dateStr = new Date(record.date).toLocaleString('ru-RU');
  let text = '';
  if (record.type === 'pressure') {
    text = `🚨 СРОЧНО! Мне нужна помощь! Мое последнее давление: ${record.sys}/${record.dia}, пульс: ${record.pulse} (${dateStr})`;
  } else {
    text = `🚨 СРОЧНО! Мне нужна помощь! Мой последний сахар: ${record.sugar} (${dateStr})`;
  }
  showConfirm('Отправка', 'Отправить данные в СМС?', 'Отправить', 'btn-primary', () => {
    window.location.href = `sms:${phone}?body=${encodeURIComponent(text)}`;
  });
};

window.editRecord = function(id) {
  const record = records.find(r => r.id === id); if (!record) return;
  editingId = id; currentRecordType = record.type; const dateStr = timestampToInputFormat(record.date);
  if (record.type === 'pressure') {
    $('inpSys').value = record.sys; $('inpDia').value = record.dia; $('inpPulse').value = record.pulse;
    $('inpDateTime').value = dateStr; $('modalPressure').hidden = false; setActiveInput($('inpSys'));
  } else {
    $('inpSugar').value = record.sugar; $('chkFasting').checked = record.fasting;
    $('inpDateTimeSugar').value = dateStr; $('modalSugar').hidden = false; setActiveInput($('inpSugar'));
  }
};

window.deleteRecord = function(id) {
  showConfirm('Удаление', 'Вы уверены, что хотите удалить эту запись?', 'Удалить', 'btn-danger', () => {
    records = records.filter(r => r.id !== id); localStorage.setItem('zabota_records', JSON.stringify(records));
    renderRecords(); updateTrafficLight();
  });
};