/**
 * 예워니 맘마기록 - Supabase 클라우드 데이터베이스 연동 클라이언트
 * 
 * 1. 로컬스토리지 + Supabase 양방향 실시간 동기화 (Offline-First & Cloud-Synced)
 * 2. 영구 보존: 기기 변경, 브라우저 캐시 삭제, Vercel 배포 시에도 데이터 손실 방지
 */

const SupabaseService = (function () {
  // Supabase 프로젝트 설정 (ACTIVE_HEALTHY 프로젝트)
  const SUPABASE_URL = 'https://voiofojgktvmwspnwgdr.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZvaW9mb2pna3R2bXdzcG53Z2RyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNjAwMTEsImV4cCI6MjEwNjgzNjAxMX0.kmIAmNgeGUqzCD7z68oJWl_9WevtAm8CjYdQj3yRv6M';
  const TABLE_NAME = 'meal_records';

  let client = null;
  let isConnected = false;

  function init() {
    if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
      try {
        client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        isConnected = true;
        console.log('✅ Supabase 클라이언트 연결 성공:', SUPABASE_URL);
      } catch (err) {
        console.warn('Supabase 초기화 실패:', err);
      }
    }
  }

  /**
   * 로컬 스키마 객체 -> Supabase DB snake_case 변환
   */
  function toDbRow(record) {
    return {
      id: record.id,
      stage: record.stage,
      record_date: record.recordDate,
      d_day_count: record.dDayCount,
      new_ingredient: record.newIngredient || null,
      meal_name: record.mealName,
      meal_brand: record.mealBrand || null,
      topping_name: record.toppingName || null,
      topping_brand: record.toppingBrand || null,
      total_prepared_gram: record.totalPreparedGram,
      eaten_fraction: record.eatenFraction,
      eaten_gram: record.eatenGram,
      nursing_amount_ml: record.nursingAmountMl,
      has_allergy: Boolean(record.hasAllergy),
      allergy_symptom: record.allergySymptom || null,
      memo: record.memo || null,
      created_at: record.createdAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  /**
   * Supabase DB snake_case -> 로컬 스키마 객체 변환
   */
  function fromDbRow(row) {
    return {
      id: row.id,
      stage: row.stage,
      recordDate: row.record_date,
      dDayCount: row.d_day_count,
      newIngredient: row.new_ingredient || '',
      mealName: row.meal_name,
      mealBrand: row.meal_brand || '',
      toppingName: row.topping_name || '',
      toppingBrand: row.topping_brand || '',
      totalPreparedGram: row.total_prepared_gram,
      eatenFraction: row.eaten_fraction,
      eatenGram: row.eaten_gram,
      nursingAmountMl: row.nursing_amount_ml,
      hasAllergy: Boolean(row.has_allergy),
      allergySymptom: row.allergy_symptom || '',
      memo: row.memo || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  /**
   * 클라우드 전체 데이터 조회 및 로컬과 병합
   */
  async function fetchAll() {
    if (!client) init();
    if (!client) return null;

    try {
      const { data, error } = await client
        .from(TABLE_NAME)
        .select('*')
        .order('record_date', { ascending: false });

      if (error) {
        console.warn('Supabase fetch 에러:', error);
        return null;
      }

      return (data || []).map(fromDbRow);
    } catch (err) {
      console.warn('Supabase 네트워크 통신 오류:', err);
      return null;
    }
  }

  /**
   * 클라우드에 단일 레코드 업서트 (생성 또는 수정)
   */
  async function upsertRecord(record) {
    if (!client) init();
    if (!client) return false;

    try {
      const row = toDbRow(record);
      const { error } = await client
        .from(TABLE_NAME)
        .upsert(row, { onConflict: 'id' });

      if (error) {
        console.warn('Supabase upsert 실패:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase upsert 네트워크 오류:', err);
      return false;
    }
  }

  /**
   * 클라우드에서 레코드 삭제
   */
  async function deleteRecord(id) {
    if (!client) init();
    if (!client) return false;

    try {
      const { error } = await client
        .from(TABLE_NAME)
        .delete()
        .eq('id', id);

      if (error) {
        console.warn('Supabase delete 실패:', error);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('Supabase delete 네트워크 오류:', err);
      return false;
    }
  }

  /**
   * 로컬 데이터를 클라우드에 일괄 백업 동기화
   */
  async function syncLocalToCloud(localRecords) {
    if (!client) init();
    if (!client || !localRecords || localRecords.length === 0) return;

    try {
      const rows = localRecords.map(toDbRow);
      await client.from(TABLE_NAME).upsert(rows, { onConflict: 'id' });
      console.log(`☁️ Supabase에 로컬 데이터 ${rows.length}건 동기화 완료!`);
    } catch (e) {
      console.warn('동기화 중 오류 발생:', e);
    }
  }

  return {
    init,
    fetchAll,
    upsertRecord,
    deleteRecord,
    syncLocalToCloud,
    isConnected: () => isConnected
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SupabaseService;
} else if (typeof window !== 'undefined') {
  window.SupabaseService = SupabaseService;
}
