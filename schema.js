/**
 * 예워니 맘마기록 - 데이터 모델 및 스키마 명세 (Data Model Specification)
 * PRD 섹션 5: 데이터 스키마 설계 기준
 * 
 * @typedef {'EARLY' | 'MID' | 'LATE'} MealStage
 * 
 * @typedef {Object} MealRecord
 * @property {string} id - 고유 식별자 (UUID v4)
 * @property {MealStage} stage - 이유식 단계 (EARLY: 초기, MID: 중기, LATE: 후기)
 * @property {string} recordDate - 이유식 급여 날짜 (형식: YYYY-MM-DD)
 * @property {number} dDayCount - 출생 기준 경과일 (D+일수, 양의 정수)
 * @property {string|null} newIngredient - 처음 먹인 신규 식재료 (없을 시 빈 문자열 또는 null)
 * @property {string} mealName - 이유식 명칭 (예: '초기 쌀미음', '소고기오이미음')
 * @property {string} mealBrand - 이유식 제조/구매 업체 (예: '직접 조리 (엄마표)', '베이비본죽')
 * @property {string} toppingName - 토핑 재료명 및 분량 (예: '한우소고기 10g')
 * @property {string} toppingBrand - 토핑 업체/출처
 * @property {number} totalPreparedGram - 준비한 총량 (단위: g, 양의 정수)
 * @property {number} eatenFraction - 5분할 게이지 바 선택 구획 (0: 거부, 1: 20%, 2: 40%, 3: 60%, 4: 80%, 5: 100%)
 * @property {number} eatenGram - 정밀 환산된 실제 섭취량 (단위: g, 공식: totalPreparedGram * (eatenFraction / 5))
 * @property {number} nursingAmountMl - 수유량 (단위: ml, 0 이상의 정수)
 * @property {boolean} hasAllergy - 알러지 이상 징후 발생 여부
 * @property {string} allergySymptom - 알러지 발생 시 상세 증상 및 발생 부위
 * @property {string} memo - 특이사항, 배변 상태, 아기 기분 등 추가 메모
 * @property {string} createdAt - 레코드 생성 시각 (ISO 8601 Timestamp)
 * @property {string} [updatedAt] - 레코드 최종 수정 시각 (ISO 8601 Timestamp)
 */

const MealModel = (function () {
  const SCHEMA_VERSION = '1.0.0';

  /**
   * UUID v4 표준 생성 함수 (crypto.randomUUID 지원 여부 처리)
   * @returns {string}
   */
  function generateUUIDv4() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    // Fallback v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 단계 유효성 검증
   * @param {string} stage 
   * @returns {boolean}
   */
  function isValidStage(stage) {
    return ['EARLY', 'MID', 'LATE'].includes(stage);
  }

  /**
   * 섭취량 환산 공식 (PRD 명세)
   * eatenGram = round(totalPreparedGram * (eatenFraction / 5))
   * @param {number} totalGram 
   * @param {number} fraction 
   * @returns {number}
   */
  function calculateEatenGram(totalGram, fraction) {
    const total = Math.max(0, parseInt(totalGram, 10) || 0);
    const frac = Math.min(5, Math.max(0, parseInt(fraction, 10) || 0));
    return Math.round(total * (frac / 5));
  }

  /**
   * 신규 MealRecord 인스턴스 팩토리
   * @param {Partial<MealRecord>} raw
   * @returns {MealRecord}
   */
  function create(raw = {}) {
    const totalPreparedGram = Math.max(0, parseInt(raw.totalPreparedGram, 10) || 50);
    const eatenFraction = typeof raw.eatenFraction === 'number' ? Math.max(0, Math.min(5, raw.eatenFraction)) : 4;
    const eatenGram = raw.eatenGram !== undefined ? raw.eatenGram : calculateEatenGram(totalPreparedGram, eatenFraction);

    return {
      id: raw.id || generateUUIDv4(),
      stage: isValidStage(raw.stage) ? raw.stage : 'EARLY',
      recordDate: raw.recordDate || new Date().toISOString().slice(0, 10),
      dDayCount: Math.max(0, parseInt(raw.dDayCount, 10) || 0),
      newIngredient: raw.newIngredient ? String(raw.newIngredient).trim() : null,
      mealName: raw.mealName ? String(raw.mealName).trim() : '이유식',
      mealBrand: raw.mealBrand ? String(raw.mealBrand).trim() : '직접 조리 (엄마표)',
      toppingName: raw.toppingName ? String(raw.toppingName).trim() : '',
      toppingBrand: raw.toppingBrand ? String(raw.toppingBrand).trim() : '',
      totalPreparedGram: totalPreparedGram,
      eatenFraction: eatenFraction,
      eatenGram: eatenGram,
      nursingAmountMl: Math.max(0, parseInt(raw.nursingAmountMl, 10) || 0),
      hasAllergy: Boolean(raw.hasAllergy),
      allergySymptom: raw.hasAllergy ? String(raw.allergySymptom || '').trim() : '',
      memo: raw.memo ? String(raw.memo).trim() : '',
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: raw.updatedAt || new Date().toISOString()
    };
  }

  /**
   * 유효성 검증 함수
   * @param {MealRecord} record 
   * @returns {{ isValid: boolean, errors: string[] }}
   */
  function validate(record) {
    const errors = [];

    if (!record.id || typeof record.id !== 'string') {
      errors.push('id는 필수 문자열(UUID)이어야 합니다.');
    }
    if (!isValidStage(record.stage)) {
      errors.push("stage는 'EARLY', 'MID', 'LATE' 중 하나여야 합니다.");
    }
    if (!record.recordDate || !/^\d{4}-\d{2}-\d{2}$/.test(record.recordDate)) {
      errors.push('recordDate는 YYYY-MM-DD 형식이어야 합니다.');
    }
    if (typeof record.dDayCount !== 'number' || record.dDayCount < 0) {
      errors.push('dDayCount는 0 이상의 정수여야 합니다.');
    }
    if (!record.mealName || record.mealName.trim() === '') {
      errors.push('mealName(이유식 명칭)은 필수 항목입니다.');
    }
    if (typeof record.totalPreparedGram !== 'number' || record.totalPreparedGram < 0) {
      errors.push('totalPreparedGram은 0 이상의 정수(g)여야 합니다.');
    }
    if (typeof record.eatenFraction !== 'number' || record.eatenFraction < 0 || record.eatenFraction > 5) {
      errors.push('eatenFraction은 0부터 5 사이의 구획 값이어야 합니다.');
    }
    if (record.hasAllergy && (!record.allergySymptom || record.allergySymptom.trim() === '')) {
      errors.push('알러지 발생 체크 시 allergySymptom(상세 증상)은 필수입니다.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  return {
    SCHEMA_VERSION,
    generateUUIDv4,
    isValidStage,
    calculateEatenGram,
    create,
    validate
  };
})();

// Node 환경과 브라우저 환경 모두 지원
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MealModel;
} else if (typeof window !== 'undefined') {
  window.MealModel = MealModel;
}
