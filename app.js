/**
 * 예워니 맘마기록 (Baby Food Tracker) - 메인 애플리케이션 로직
 * PRD 4.1 ~ 4.4 요구사항 및 데이터 스키마 완벽 준수
 */

// ==========================================
// 상수 및 기본 설정
// ==========================================
const STORAGE_KEY = 'yewon_meal_records_v1';
const BIRTH_DATE_ESTIMATE = '2026-04-22'; // D+183일 기준 가상 예원이 출생일

// 현재 앱 상태
const state = {
  activeScreen: 'home', // 'home' | 'main'
  activeTab: 'record',   // 'record' | 'history'
  selectedStage: 'EARLY', // 'EARLY' | 'MID' | 'LATE'
  historyFilter: 'ALL',  // 'ALL' | 'EARLY' | 'MID' | 'LATE' | 'ALLERGY_ONLY'
  eatenFraction: 4,      // 1 ~ 5 (기본 4칸 80%)
  editingId: null,
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(), // 0 ~ 11
  selectedDateStr: getTodayString()
};

// ==========================================
// 유틸리티 함수
// ==========================================
function getStoredRecords() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('로컬스토리지 로드 실패:', e);
    return [];
  }
}

function saveStoredRecords(records) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('로컬스토리지 저장 실패:', e);
  }
}

function generateId() {
  if (typeof MealModel !== 'undefined' && MealModel.generateUUIDv4) {
    return MealModel.generateUUIDv4();
  }
  return 'meal_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
}

function formatKoreanDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;
  
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  const dayName = dayNames[date.getDay()];
  
  return `${month}월 ${day}일 (${dayName})`;
}

function getTodayString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function calculateDDay(dateStr) {
  try {
    const target = new Date(dateStr);
    const birth = new Date(BIRTH_DATE_ESTIMATE);
    const diffTime = target.getTime() - birth.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 183;
  } catch {
    return 183;
  }
}

function showToast(msg) {
  const toast = document.getElementById('toastMessage');
  toast.textContent = msg;
  toast.classList.remove('hide');
  setTimeout(() => {
    toast.classList.add('hide');
  }, 2200);
}

// ==========================================
// DOM 요소 참조
// ==========================================
const screenHome = document.getElementById('screen-home');
const screenMain = document.getElementById('screen-main');
const btnStartApp = document.getElementById('btnStartApp');
const btnHeaderHome = document.getElementById('btnHeaderHome');
const btnSampleData = document.getElementById('btnSampleData');

const segmentTabs = document.querySelectorAll('.segment-tab');
const tabRecord = document.getElementById('tab-record');
const tabHistory = document.getElementById('tab-history');
const historyCountBadge = document.getElementById('historyCountBadge');

const stageChips = document.querySelectorAll('.stage-chip');
const histFilterChips = document.querySelectorAll('.hist-filter-chip');

// 폼 요소
const recordForm = document.getElementById('recordForm');
const editRecordId = document.getElementById('editRecordId');
const recordDate = document.getElementById('recordDate');
const dDayCount = document.getElementById('dDayCount');
const newIngredient = document.getElementById('newIngredient');
const mealName = document.getElementById('mealName');
const mealBrandSelect = document.getElementById('mealBrandSelect');
const mealBrandCustom = document.getElementById('mealBrandCustom');
const toppingName = document.getElementById('toppingName');
const toppingBrand = document.getElementById('toppingBrand');
const nursingAmountMl = document.getElementById('nursingAmountMl');
const recordMemo = document.getElementById('recordMemo');

// 5분할 게이지 바 요소
const totalPreparedGram = document.getElementById('totalPreparedGram');
const eatenPercentText = document.getElementById('eatenPercentText');
const fiveBarContainer = document.getElementById('fiveBarContainer');
const barBlocks = document.querySelectorAll('.bar-block');
const gaugeResultSummary = document.getElementById('gaugeResultSummary');
const btnZeroEaten = document.getElementById('btnZeroEaten');

// 알러지 요소
const allergyCard = document.getElementById('allergyCard');
const hasAllergy = document.getElementById('hasAllergy');
const allergyDetailPanel = document.getElementById('allergyDetailPanel');
const allergySymptom = document.getElementById('allergySymptom');

// 달력 요소
const calendarCurrentLabel = document.getElementById('calendarCurrentLabel');
const calendarDaysGrid = document.getElementById('calendarDaysGrid');
const btnPrevMonth = document.getElementById('btnPrevMonth');
const btnNextMonth = document.getElementById('btnNextMonth');
const btnTodayCalendar = document.getElementById('btnTodayCalendar');
const selectedDateTitle = document.getElementById('selectedDateTitle');
const selectedDateCardContainer = document.getElementById('selectedDateCardContainer');
const btnAddRecordForDate = document.getElementById('btnAddRecordForDate');

// 기타 요소
const homeDDayText = document.getElementById('homeDDayText');
const btnCancelEdit = document.getElementById('btnCancelEdit');
const saveBtnText = document.getElementById('saveBtnText');

// ==========================================
// 4.1. 홈 화면 & 화면 전환 인터랙션
// ==========================================
function switchScreen(targetScreen) {
  state.activeScreen = targetScreen;
  if (targetScreen === 'home') {
    screenHome.classList.add('active');
    screenMain.classList.remove('active');
  } else {
    screenHome.classList.remove('active');
    screenMain.classList.add('active');
  }
}

btnStartApp.addEventListener('click', () => {
  switchScreen('main');
  switchTab('record');
});

btnHeaderHome.addEventListener('click', () => {
  switchScreen('home');
});

// ==========================================
// 4.2. 상단 글로벌 네비게이션
// ==========================================
function switchTab(tabName) {
  state.activeTab = tabName;
  
  segmentTabs.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });

  if (tabName === 'record') {
    tabRecord.classList.add('active');
    tabHistory.classList.remove('active');
  } else {
    tabRecord.classList.remove('active');
    tabHistory.classList.add('active');
    renderCalendar();
  }
}

segmentTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    switchTab(btn.dataset.tab);
  });
});

function setStage(stage) {
  state.selectedStage = stage;
  stageChips.forEach(chip => {
    chip.classList.toggle('active', chip.dataset.stage === stage);
  });
}

stageChips.forEach(chip => {
  chip.addEventListener('click', () => {
    setStage(chip.dataset.stage);
    showToast(`단계를 '${chip.querySelector('.chip-title').textContent}'(으)로 선택했습니다.`);
  });
});

// ==========================================
// 4.3. [기록하기] 화면 인터랙션 로직
// ==========================================

// 날짜 변경 시 D-Day 자동 계산
recordDate.addEventListener('change', () => {
  if (recordDate.value) {
    dDayCount.value = calculateDDay(recordDate.value);
  }
});

// 추천 신규 재료 칩 클릭 시 추가
document.querySelectorAll('.quick-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const val = chip.dataset.val;
    if (newIngredient.value.trim() === '') {
      newIngredient.value = val;
    } else if (!newIngredient.value.includes(val)) {
      newIngredient.value += `, ${val}`;
    }
    newIngredient.focus();
  });
});

// 알러지 추천 증상 칩
document.querySelectorAll('.symptom-chip').forEach(chip => {
  chip.addEventListener('click', () => {
    const val = chip.dataset.symptom;
    if (allergySymptom.value.trim() === '') {
      allergySymptom.value = val;
    } else if (!allergySymptom.value.includes(val)) {
      allergySymptom.value += `, ${val}`;
    }
    allergySymptom.focus();
  });
});

// 이유식 업체 '직접 입력...' 처리
mealBrandSelect.addEventListener('change', () => {
  if (mealBrandSelect.value === 'custom') {
    mealBrandCustom.classList.remove('hide');
    mealBrandCustom.focus();
  } else {
    mealBrandCustom.classList.add('hide');
  }
});

// 💡 5분할 막대 게이지 바 인터랙션
function updateGaugeUI() {
  const fraction = state.eatenFraction; // 0 ~ 5
  const total = parseInt(totalPreparedGram.value, 10) || 50;
  
  // 막대 블록 채움 상태 변경
  barBlocks.forEach(block => {
    const level = parseInt(block.dataset.level, 10);
    block.classList.toggle('filled', level <= fraction);
  });

  const percent = fraction * 20;
  const eatenGram = typeof MealModel !== 'undefined' 
    ? MealModel.calculateEatenGram(total, fraction) 
    : Math.round(total * (fraction / 5));

  if (fraction === 0) {
    eatenPercentText.textContent = `0% (0칸 거부)`;
    gaugeResultSummary.innerHTML = `총 <strong>${total}g</strong> 중 <strong>0g</strong> 섭취 (거부)`;
  } else if (fraction === 5) {
    eatenPercentText.textContent = `100% (5칸 완밥! 🎉)`;
    gaugeResultSummary.innerHTML = `총 <strong>${total}g</strong> 중 <strong>${eatenGram}g</strong> 전량 완밥!`;
  } else {
    eatenPercentText.textContent = `${percent}% (${fraction}칸)`;
    gaugeResultSummary.innerHTML = `총 <strong>${total}g</strong> 중 <strong>${eatenGram}g</strong> 섭취`;
  }
}

// 막대 터치 이벤트
barBlocks.forEach(block => {
  block.addEventListener('click', () => {
    const level = parseInt(block.dataset.level, 10);
    state.eatenFraction = level;
    updateGaugeUI();
  });
});

btnZeroEaten.addEventListener('click', () => {
  state.eatenFraction = 0;
  updateGaugeUI();
});

totalPreparedGram.addEventListener('input', () => {
  updateGaugeUI();
});

// 알러지 토글 스위치 인터랙션
hasAllergy.addEventListener('change', () => {
  const isChecked = hasAllergy.checked;
  allergyCard.classList.toggle('is-active', isChecked);
  allergyDetailPanel.classList.toggle('hide', !isChecked);
  if (isChecked) {
    allergySymptom.setAttribute('required', 'required');
    allergySymptom.focus();
  } else {
    allergySymptom.removeAttribute('required');
  }
});

// 폼 리셋 함수
function resetForm() {
  recordForm.reset();
  editRecordId.value = '';
  state.editingId = null;
  btnCancelEdit.classList.add('hide');
  saveBtnText.textContent = '오늘의 맘마 저장하기';

  // 오늘 날짜 및 기본값 복원
  recordDate.value = getTodayString();
  dDayCount.value = calculateDDay(recordDate.value);
  mealBrandCustom.classList.add('hide');
  mealBrandSelect.value = '베이비본죽';
  totalPreparedGram.value = '50';
  nursingAmountMl.value = '160';

  state.eatenFraction = 4;
  updateGaugeUI();

  hasAllergy.checked = false;
  allergyCard.classList.remove('is-active');
  allergyDetailPanel.classList.add('hide');
  allergySymptom.removeAttribute('required');
}

btnCancelEdit.addEventListener('click', () => {
  resetForm();
  showToast('수정이 취소되었습니다.');
});

// 폼 제출 (저장/수정)
recordForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const total = parseInt(totalPreparedGram.value, 10) || 0;
  const fraction = state.eatenFraction;
  const calculatedEatenGram = Math.round(total * (fraction / 5));

  // 업체명 산출
  let finalBrand = mealBrandSelect.value;
  if (finalBrand === 'custom') {
    finalBrand = mealBrandCustom.value.trim() || '직접 입력';
  }

  // PRD 섹션 5 데이터 스키마 모델 생성
  const rawData = {
    id: editRecordId.value || generateId(),
    stage: state.selectedStage,
    recordDate: recordDate.value,
    dDayCount: parseInt(dDayCount.value, 10) || calculateDDay(recordDate.value),
    newIngredient: newIngredient.value.trim() || null,
    mealName: mealName.value.trim(),
    mealBrand: finalBrand,
    toppingName: toppingName.value.trim(),
    toppingBrand: toppingBrand.value.trim(),
    totalPreparedGram: total,
    eatenFraction: fraction,
    nursingAmountMl: parseInt(nursingAmountMl.value, 10) || 0,
    hasAllergy: hasAllergy.checked,
    allergySymptom: hasAllergy.checked ? allergySymptom.value.trim() : '',
    memo: recordMemo.value.trim()
  };

  const recordData = typeof MealModel !== 'undefined' ? MealModel.create(rawData) : {
    ...rawData,
    eatenGram: calculatedEatenGram,
    createdAt: new Date().toISOString()
  };

  // 스키마 유효성 검증
  if (typeof MealModel !== 'undefined') {
    const validation = MealModel.validate(recordData);
    if (!validation.isValid) {
      alert('입력 데이터 오류:\n' + validation.errors.join('\n'));
      return;
    }
  }

  const records = getStoredRecords();

  if (state.editingId) {
    // 수정 모드
    const index = records.findIndex(r => r.id === state.editingId);
    if (index !== -1) {
      records[index] = { ...records[index], ...recordData };
    }
    showToast('기록이 성공적으로 수정되었습니다! ✏️');
  } else {
    // 신규 모드
    records.unshift(recordData);
    showToast('오늘의 맘마가 잘 저장되었어요! 🍼');
  }

  saveStoredRecords(records);
  resetForm();
  updateBadgeCounts();

  // Supabase 클라우드 실시간 동기화 (영구 보존)
  if (typeof SupabaseService !== 'undefined') {
    SupabaseService.upsertRecord(recordData).then(success => {
      if (success) {
        console.log('☁️ Supabase 클라우드에 영구 적재 완료:', recordData.id);
      }
    });
  }
  state.selectedDateStr = recordData.recordDate;
  // 저장된 날짜의 연/월로 달력 이동
  const [recY, recM] = recordData.recordDate.split('-').map(Number);
  state.calendarYear = recY;
  state.calendarMonth = recM - 1;
  switchTab('history');
});

// ==========================================
// 4.4. [전체보기] 달력 캘린더 렌더링 및 인터랙션
// ==========================================

// 달력 월 이동 버튼 리스너
btnPrevMonth.addEventListener('click', () => {
  state.calendarMonth--;
  if (state.calendarMonth < 0) {
    state.calendarMonth = 11;
    state.calendarYear--;
  }
  renderCalendar();
});

btnNextMonth.addEventListener('click', () => {
  state.calendarMonth++;
  if (state.calendarMonth > 11) {
    state.calendarMonth = 0;
    state.calendarYear++;
  }
  renderCalendar();
});

btnTodayCalendar.addEventListener('click', () => {
  const today = new Date();
  state.calendarYear = today.getFullYear();
  state.calendarMonth = today.getMonth();
  state.selectedDateStr = getTodayString();
  renderCalendar();
});

// "+ 이 날짜에 기록" 버튼 클릭 시
btnAddRecordForDate.addEventListener('click', () => {
  resetForm();
  recordDate.value = state.selectedDateStr;
  dDayCount.value = calculateDDay(state.selectedDateStr);
  switchTab('record');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast(`${state.selectedDateStr} 날짜로 기록을 작성합니다.`);
});

function getStageName(stageKey) {
  switch (stageKey) {
    case 'EARLY': return '초기';
    case 'MID': return '중기';
    case 'LATE': return '후기';
    default: return stageKey;
  }
}

function updateBadgeCounts() {
  const records = getStoredRecords();
  if (historyCountBadge) {
    historyCountBadge.textContent = records.length;
  }

  // 홈 화면 D-Day 최신 날짜로 갱신
  if (records.length > 0 && homeDDayText) {
    homeDDayText.textContent = `D+${records[0].dDayCount}일`;
  }
}

/**
 * 📅 월간 달력 전체 렌더링
 */
function renderCalendar() {
  updateBadgeCounts();

  const year = state.calendarYear;
  const month = state.calendarMonth; // 0 ~ 11
  
  calendarCurrentLabel.textContent = `${year}년 ${month + 1}월`;

  // 달력 그리드 초기화
  calendarDaysGrid.innerHTML = '';

  const firstDayIndex = new Date(year, month, 1).getDay(); // 해당 월 1일의 요일 (0: 일요일)
  const lastDate = new Date(year, month + 1, 0).getDate(); // 해당 월 마지막 날짜
  const prevLastDate = new Date(year, month, 0).getDate(); // 이전 달 마지막 날짜

  const records = getStoredRecords();
  // 날짜별 레코드 맵 구성: { 'YYYY-MM-DD': [MealRecord, ...] }
  const recordMap = {};
  records.forEach(r => {
    if (!recordMap[r.recordDate]) {
      recordMap[r.recordDate] = [];
    }
    recordMap[r.recordDate].push(r);
  });

  const todayStr = getTodayString();

  // 1. 이전 달 날짜 채우기
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const dayNum = prevLastDate - i;
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.innerHTML = `<span class="cal-day-num">${dayNum}</span>`;
    calendarDaysGrid.appendChild(cell);
  }

  // 2. 이번 달 날짜 채우기 (1 ~ lastDate)
  for (let d = 1; d <= lastDate; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayOfWeek = new Date(year, month, d).getDay();

    const cell = document.createElement('div');
    cell.className = 'cal-day-cell';
    if (dayOfWeek === 0) cell.classList.add('sun');
    if (dayOfWeek === 6) cell.classList.add('sat');

    if (dateStr === todayStr) {
      cell.classList.add('is-today');
    }
    if (dateStr === state.selectedDateStr) {
      cell.classList.add('is-selected');
    }

    // 기록 존재 여부 확인
    const dayRecords = recordMap[dateStr] || [];
    if (dayRecords.length > 0) {
      cell.classList.add('has-record');

      const hasAllergyInDay = dayRecords.some(r => r.hasAllergy);
      if (hasAllergyInDay) {
        cell.classList.add('has-allergy');
      }

      // 첫 번째 기록의 섭취량 또는 요약
      const mainRecord = dayRecords[0];
      const hasNew = dayRecords.some(r => !!r.newIngredient);

      const nursingChipHtml = mainRecord.nursingAmountMl > 0 
        ? `<span class="cal-nursing-chip" title="수유량: ${mainRecord.nursingAmountMl}ml">${mainRecord.nursingAmountMl}ml</span>` 
        : '';

      const dotsHtml = `
        <div class="cal-indicator-dots">
          <span class="dot-indicator dot-completed" title="이유식 완료"></span>
          ${hasNew ? '<span class="dot-indicator dot-new" title="신규 재료"></span>' : ''}
          ${hasAllergyInDay ? '<span class="dot-indicator dot-allergy" title="알러지 발생"></span>' : ''}
        </div>
      `;

      cell.innerHTML = `
        <span class="cal-day-num">${d}</span>
        <div class="cal-mini-badge-wrap">
          <div class="cal-values-row">
            <span class="cal-gram-chip" title="이유식 섭취: ${mainRecord.eatenGram}g">${mainRecord.eatenGram}g</span>
            ${nursingChipHtml}
          </div>
          ${dotsHtml}
        </div>
      `;
    } else {
      cell.innerHTML = `<span class="cal-day-num">${d}</span>`;
    }

    // 날짜 셀 클릭 시 선택
    cell.addEventListener('click', () => {
      selectDate(dateStr);
    });

    calendarDaysGrid.appendChild(cell);
  }

  // 3. 다음 달 날짜 채우기 (총 셀 수가 7의 배수가 되도록)
  const totalRendered = firstDayIndex + lastDate;
  const remainingCells = (7 - (totalRendered % 7)) % 7;
  for (let d = 1; d <= remainingCells; d++) {
    const cell = document.createElement('div');
    cell.className = 'cal-day-cell other-month';
    cell.innerHTML = `<span class="cal-day-num">${d}</span>`;
    calendarDaysGrid.appendChild(cell);
  }

  // 선택된 날짜 상세 렌더링
  renderSelectedDateDetails(state.selectedDateStr);
}

/**
 * 특정 날짜 선택
 */
function selectDate(dateStr) {
  state.selectedDateStr = dateStr;

  // 그리드 내 선택 스타일 갱신
  document.querySelectorAll('.cal-day-cell').forEach(cell => {
    cell.classList.remove('is-selected');
  });

  const cells = calendarDaysGrid.querySelectorAll('.cal-day-cell:not(.other-month)');
  const [y, m, d] = dateStr.split('-').map(Number);
  if (state.calendarYear === y && state.calendarMonth === m - 1) {
    const targetCell = cells[d - 1];
    if (targetCell) {
      targetCell.classList.add('is-selected');
    }
  }

  renderSelectedDateDetails(dateStr);
}

/**
 * 🔍 선택된 날짜의 상세 맘마 카드 목록 렌더링
 */
function renderSelectedDateDetails(dateStr) {
  const records = getStoredRecords().filter(r => r.recordDate === dateStr);

  selectedDateTitle.innerHTML = `📅 <span>${formatKoreanDate(dateStr)}</span> 상세 기록`;
  selectedDateCardContainer.innerHTML = '';

  if (records.length === 0) {
    selectedDateCardContainer.innerHTML = `
      <div class="no-record-card">
        <p>🥣 이 날짜에는 아직 작성된 맘마 일지가 없어요.</p>
        <button class="btn-inline-add" id="btnInlineAddRecord">
          + ${formatKoreanDate(dateStr)} 맘마 기록하기
        </button>
      </div>
    `;

    document.getElementById('btnInlineAddRecord').addEventListener('click', () => {
      resetForm();
      recordDate.value = dateStr;
      dDayCount.value = calculateDDay(dateStr);
      switchTab('record');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    return;
  }

  // 날짜별 상세 카드 렌더링
  records.forEach(item => {
    const card = document.createElement('div');
    card.className = `meal-card ${item.hasAllergy ? 'has-allergy' : ''}`;

    const percent = item.eatenFraction * 20;

    const toppingLine = item.toppingName ? 
      `<div class="card-topping-line">
        <span>🍓 토핑: <strong>${escapeHtml(item.toppingName)}</strong> ${item.toppingBrand ? `(${escapeHtml(item.toppingBrand)})` : ''}</span>
      </div>` : '';

    const newBadgeLine = item.newIngredient ? 
      `<div class="card-new-ingredient-row">
        <span class="new-badge">
          <span class="tag">NEW</span> 처음 먹은 재료: <strong>${escapeHtml(item.newIngredient)}</strong>
        </span>
      </div>` : '';

    const allergyBox = item.hasAllergy ? 
      `<div class="card-allergy-detail-box">
        <div class="allergy-alert-text">
          <span>🚨 알러지 증상:</span> 
          <span>${escapeHtml(item.allergySymptom || '이상 징후 발생')}</span>
        </div>
      </div>` : '';

    const memoLine = item.memo ? 
      `<div class="card-memo-line">💬 ${escapeHtml(item.memo)}</div>` : '';

    card.innerHTML = `
      <div class="card-header-bar">
        <div class="card-date-group">
          <span class="card-date">${formatKoreanDate(item.recordDate)}</span>
          <span class="card-dday">D+${item.dDayCount}</span>
          <span class="card-stage-badge ${item.stage}">${getStageName(item.stage)}</span>
        </div>
        ${item.hasAllergy ? `<div class="card-allergy-alert-pill">⚠️ 알러지 주의</div>` : ''}
      </div>

      ${newBadgeLine}

      <div class="card-meal-title">
        ${escapeHtml(item.mealName)}
        ${item.mealBrand ? `<span class="card-brand">· ${escapeHtml(item.mealBrand)}</span>` : ''}
      </div>

      ${toppingLine}

      <!-- 섭취 데이터 수치 및 미니 게이지 바 -->
      <div class="card-metrics-grid">
        <div class="metric-item">
          <span class="metric-label">이유식 먹은 양</span>
          <div class="metric-value-row">
            <span class="metric-val">${item.eatenGram}g</span>
            <span class="metric-sub">/ ${item.totalPreparedGram}g (${percent}%)</span>
          </div>
          <div class="mini-gauge-track">
            <div class="mini-gauge-fill" style="width: ${percent}%;"></div>
          </div>
        </div>

        <div class="metric-item">
          <span class="metric-label">수유량</span>
          <div class="metric-value-row">
            <span class="metric-val">${item.nursingAmountMl}ml</span>
          </div>
        </div>
      </div>

      ${allergyBox}
      ${memoLine}

      <div class="card-footer-actions">
        <button class="card-act-btn edit-btn" data-id="${item.id}">수정</button>
        <button class="card-act-btn delete delete-btn" data-id="${item.id}">삭제</button>
      </div>
    `;

    card.querySelector('.edit-btn').addEventListener('click', () => {
      startEditRecord(item.id);
    });

    card.querySelector('.delete-btn').addEventListener('click', () => {
      deleteRecord(item.id);
    });

    selectedDateCardContainer.appendChild(card);
  });
}

function startEditRecord(id) {
  const records = getStoredRecords();
  const target = records.find(r => r.id === id);
  if (!target) return;

  state.editingId = target.id;
  editRecordId.value = target.id;
  setStage(target.stage || 'EARLY');

  recordDate.value = target.recordDate;
  dDayCount.value = target.dDayCount;
  newIngredient.value = target.newIngredient || '';
  mealName.value = target.mealName;
  
  // 브랜드 매칭
  const standardBrands = ['직접 조리 (엄마표)', '베베쿡', '베이비본죽', '얌이밀', '짱죽', '팜투베이비'];
  if (standardBrands.includes(target.mealBrand)) {
    mealBrandSelect.value = target.mealBrand;
    mealBrandCustom.classList.add('hide');
  } else {
    mealBrandSelect.value = 'custom';
    mealBrandCustom.classList.remove('hide');
    mealBrandCustom.value = target.mealBrand || '';
  }

  toppingName.value = target.toppingName || '';
  toppingBrand.value = target.toppingBrand || '';
  totalPreparedGram.value = target.totalPreparedGram || 50;
  nursingAmountMl.value = target.nursingAmountMl || 0;
  recordMemo.value = target.memo || '';

  // 게이지 바
  state.eatenFraction = target.eatenFraction;
  updateGaugeUI();

  // 알러지
  hasAllergy.checked = !!target.hasAllergy;
  allergyCard.classList.toggle('is-active', hasAllergy.checked);
  allergyDetailPanel.classList.toggle('hide', !hasAllergy.checked);
  allergySymptom.value = target.allergySymptom || '';
  if (hasAllergy.checked) {
    allergySymptom.setAttribute('required', 'required');
  }

  btnCancelEdit.classList.remove('hide');
  saveBtnText.textContent = '수정 내용 저장하기';

  switchTab('record');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('수정 모드로 불러왔습니다.');
}

function deleteRecord(id) {
  if (!confirm('이 맘마 기록을 정말 삭제할까요?')) return;
  let records = getStoredRecords();
  records = records.filter(r => r.id !== id);
  saveStoredRecords(records);

  // Supabase 클라우드에서도 삭제
  if (typeof SupabaseService !== 'undefined') {
    SupabaseService.deleteRecord(id);
  }

  renderCalendar();
  showToast('기록이 삭제되었습니다.');
}

btnEmptyToRecord.addEventListener('click', () => {
  switchTab('record');
});

// ==========================================
// PRD 테스트를 위한 샘플 데이터 생성기
// ==========================================
const SAMPLE_RECORDS = [
  {
    id: 'sample_01',
    stage: 'EARLY',
    recordDate: '2026-10-22',
    dDayCount: 183,
    newIngredient: '오이',
    mealName: '소고기오이미음',
    mealBrand: '베이비본죽',
    toppingName: '한우소고기 10g',
    toppingBrand: '직접 조리',
    totalPreparedGram: 50,
    eatenFraction: 4,
    eatenGram: 40,
    nursingAmountMl: 140,
    hasAllergy: true,
    allergySymptom: '입 주변 및 볼에 붉은 반점 올라옴, 손으로 긁으려 함',
    memo: '오이를 처음 먹여봤는데 30분 뒤 볼이 붉어짐. 당분간 오이 급여 중단 필요!',
    createdAt: '2026-10-22T10:00:00.000Z'
  },
  {
    id: 'sample_02',
    stage: 'EARLY',
    recordDate: '2026-10-21',
    dDayCount: 182,
    newIngredient: '단호박',
    mealName: '소고기단호박미음',
    mealBrand: '베이비본죽',
    toppingName: '',
    toppingBrand: '',
    totalPreparedGram: 50,
    eatenFraction: 5,
    eatenGram: 50,
    nursingAmountMl: 160,
    hasAllergy: false,
    allergySymptom: '',
    memo: '달달해서 그런지 5칸 50g 전량 완밥! 너무 잘 먹음 👍',
    createdAt: '2026-10-21T10:00:00.000Z'
  },
  {
    id: 'sample_03',
    stage: 'EARLY',
    recordDate: '2026-10-20',
    dDayCount: 181,
    newIngredient: '소고기',
    mealName: '소고기미음',
    mealBrand: '베베쿡',
    toppingName: '소고기 안심 5g',
    toppingBrand: '홈메이드',
    totalPreparedGram: 40,
    eatenFraction: 3,
    eatenGram: 24,
    nursingAmountMl: 170,
    hasAllergy: false,
    allergySymptom: '',
    memo: '첫 소고기 시도. 거부감 없이 냠냠 먹음.',
    createdAt: '2026-10-20T10:00:00.000Z'
  },
  {
    id: 'sample_04',
    stage: 'EARLY',
    recordDate: '2026-10-18',
    dDayCount: 179,
    newIngredient: '쌀',
    mealName: '초기 쌀미음',
    mealBrand: '직접 조리 (엄마표)',
    toppingName: '',
    toppingBrand: '',
    totalPreparedGram: 30,
    eatenFraction: 3,
    eatenGram: 18,
    nursingAmountMl: 180,
    hasAllergy: false,
    allergySymptom: '',
    memo: '대망의 첫 이유식 시작일! 숟가락 물고 방긋방긋 웃음.',
    createdAt: '2026-10-18T10:00:00.000Z'
  }
];

btnSampleData.addEventListener('click', () => {
  const current = getStoredRecords();
  if (current.length > 0 && !confirm('샘플 데이터를 추가하시겠습니까? (기존 기록 뒤에 추가됩니다)')) {
    return;
  }
  const merged = [...SAMPLE_RECORDS, ...current.filter(c => !SAMPLE_RECORDS.some(s => s.id === c.id))];
  saveStoredRecords(merged);
  updateBadgeCounts();
  if (state.activeTab === 'history') {
    renderCalendar();
  }
  showToast('샘플 맘마 기록 4건이 추가되었습니다!');
});

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

// ==========================================
// PRD 섹션 6: 비기능 요구사항 (내보내기 & 진료용 인쇄 모달)
// ==========================================
const btnExportModal = document.getElementById('btnExportModal');
const btnDirectExcel = document.getElementById('btnDirectExcel');
const exportModal = document.getElementById('exportModal');
const btnCloseExportModal = document.getElementById('btnCloseExportModal');
const btnPrintClinic = document.getElementById('btnPrintClinic');
const btnExportCsv = document.getElementById('btnExportCsv');
const btnExportJson = document.getElementById('btnExportJson');
const importJsonFileInput = document.getElementById('importJsonFileInput');

// 헤더의 [📊 엑셀 다운] 원터치 버튼
if (btnDirectExcel) {
  btnDirectExcel.addEventListener('click', () => {
    const records = getStoredRecords();
    if (typeof Exporter !== 'undefined') {
      Exporter.exportToExcel(records);
      showToast('엑셀(.xlsx) 파일이 다운로드되었습니다! 📊');
    }
  });
}

if (btnExportModal && exportModal) {
  btnExportModal.addEventListener('click', () => {
    exportModal.classList.remove('hide');
  });

  btnCloseExportModal.addEventListener('click', () => {
    exportModal.classList.add('hide');
  });

  exportModal.addEventListener('click', (e) => {
    if (e.target === exportModal) {
      exportModal.classList.add('hide');
    }
  });

  // 소아과 진료용 리포트 인쇄
  btnPrintClinic.addEventListener('click', () => {
    exportModal.classList.add('hide');
    const records = getStoredRecords();
    if (typeof Exporter !== 'undefined') {
      Exporter.printClinicReport(records);
    }
  });

  // 엑셀 (.xlsx) 다운로드
  btnExportCsv.addEventListener('click', () => {
    const records = getStoredRecords();
    if (typeof Exporter !== 'undefined') {
      Exporter.exportToExcel(records);
      showToast('엑셀(.xlsx) 파일이 다운로드되었습니다! 📊');
    }
  });

  // JSON 백업
  btnExportJson.addEventListener('click', () => {
    const records = getStoredRecords();
    if (typeof Exporter !== 'undefined') {
      Exporter.exportToJson(records);
      showToast('데이터 백업(JSON)이 완료되었습니다! 💾');
    }
  });

  // JSON 파일 복원
  importJsonFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (typeof Exporter !== 'undefined') {
      Exporter.importFromJson(
        file,
        (importedRecords) => {
          if (!confirm(`불러온 기록 ${importedRecords.length}건을 현재 데이터와 병합할까요?`)) {
            return;
          }
          const current = getStoredRecords();
          const merged = [...importedRecords, ...current.filter(c => !importedRecords.some(i => i.id === c.id))];
          saveStoredRecords(merged);
          updateBadgeCounts();
          if (state.activeTab === 'history') {
            renderCalendar();
          }
          exportModal.classList.add('hide');
          showToast(`성공적으로 ${importedRecords.length}건의 데이터를 복원했습니다! 📥`);
          e.target.value = '';
        },
        (err) => {
          alert('데이터 복원 실패: ' + err.message);
          e.target.value = '';
        }
      );
    }
  });
}

// ==========================================
// 초기화 (로컬 + Supabase 클라우드 양방향 동기화)
// ==========================================
async function initApp() {
  recordDate.value = getTodayString();
  dDayCount.value = calculateDDay(recordDate.value);
  updateGaugeUI();

  let records = getStoredRecords();
  // 최초 방문 시 샘플 데이터 자동 세팅
  if (records.length === 0) {
    saveStoredRecords(SAMPLE_RECORDS);
    records = SAMPLE_RECORDS;
  }
  updateBadgeCounts();

  // Supabase 클라우드 동기화 수행
  if (typeof SupabaseService !== 'undefined') {
    try {
      SupabaseService.init();
      const cloudSyncStatus = document.getElementById('cloudSyncStatus');
      
      const cloudRecords = await SupabaseService.fetchAll();
      if (cloudRecords && cloudRecords.length > 0) {
        // 클라우드 데이터와 로컬 데이터 병합 (클라우드 우선)
        const mergedMap = new Map();
        records.forEach(r => mergedMap.set(r.id, r));
        cloudRecords.forEach(r => mergedMap.set(r.id, r)); // 클라우드 덮어쓰기/추가
        
        const mergedList = Array.from(mergedMap.values());
        saveStoredRecords(mergedList);
        updateBadgeCounts();
        if (state.activeTab === 'history') {
          renderCalendar();
        }
        if (cloudSyncStatus) {
          cloudSyncStatus.textContent = '☁️✓';
          cloudSyncStatus.title = 'Supabase 클라우드 동기화 완료';
        }
        console.log(`☁️ Supabase 클라우드로부터 ${cloudRecords.length}건 동기화 완료!`);
      } else if (records.length > 0) {
        // 클라우드가 비어있으면 현재 로컬 데이터를 클라우드에 백업 업로드
        await SupabaseService.syncLocalToCloud(records);
        if (cloudSyncStatus) {
          cloudSyncStatus.textContent = '☁️✓';
        }
      }
    } catch (e) {
      console.warn('Supabase 초기 동기화 실패 (오프라인 모드 유지):', e);
    }
  }
}

// DOM 준비 완료 시 실행
document.addEventListener('DOMContentLoaded', initApp);
