/**
 * [PRD Section 5] 예워니 맘마기록 데이터 모델 타입 정의 (TypeScript)
 */

export type MealStage = 'EARLY' | 'MID' | 'LATE';

export interface MealRecord {
  /** 고유 식별자 (UUID v4) */
  id: string;

  /** 이유식 단계 (EARLY: 초기, MID: 중기, LATE: 후기) */
  stage: MealStage;

  /** 기록 일자 (YYYY-MM-DD) */
  recordDate: string;

  /** 태어난 지 +N일 (D+일수) */
  dDayCount: number;

  /** 처음 먹은 신규 식재료 (Nullable) */
  newIngredient: string | null;

  /** 이유식 명칭 (예: 쌀미음, 소고기단호박죽) */
  mealName: string;

  /** 이유식 구매/제조 업체 (예: 베이비본죽, 직접 조리 등) */
  mealBrand: string;

  /** 토핑 재료 (예: 한우 10g, 계란 3g) */
  toppingName: string;

  /** 토핑 업체 */
  toppingBrand: string;

  /** 준비한 총량 (g) */
  totalPreparedGram: number;

  /** 5분할 게이지 바 중 선택한 칸 (0~5) */
  eatenFraction: number;

  /** 실제 환산된 섭취량 (g) - 공식: totalPreparedGram * (eatenFraction / 5) */
  eatenGram: number;

  /** 수유량 (ml) */
  nursingAmountMl: number;

  /** 알러지 이상 징후 발생 여부 */
  hasAllergy: boolean;

  /** 알러지 상세 증상 (알러지 발생 시 필수) */
  allergySymptom: string;

  /** 특이사항, 배변 상태 등 자유 메모 */
  memo: string;

  /** 생성 시각 (ISO 8601 Timestamp) */
  createdAt: string;

  /** 최종 수정 시각 (ISO 8601 Timestamp) */
  updatedAt?: string;
}

export interface MealRecordValidationResult {
  isValid: boolean;
  errors: string[];
}
