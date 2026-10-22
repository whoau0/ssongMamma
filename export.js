/**
 * 예워니 맘마기록 - 데이터 내보내기 및 진료용 인쇄 모듈 (PRD 섹션 6 비기능 요구사항)
 * 1. 엑셀(.xlsx) 내보내기 (SheetJS 기반 순수 Excel 통합 문서)
 * 2. 엑셀(CSV) 내보내기 (UTF-8 with BOM 한글 깨짐 방지 fallback)
 * 3. 소아과 진료용 PDF 인쇄 레이아웃 생성
 * 4. JSON 전체 데이터 백업 및 복원
 */

const Exporter = (function () {
  const stageMap = { EARLY: '초기', MID: '중기', LATE: '후기' };

  /**
   * 📊 순수 엑셀(.xlsx) 파일 내보내기 (SheetJS 활용)
   * @param {Array} records 
   */
  function exportToExcel(records) {
    if (!records || records.length === 0) {
      alert('내보낼 식단 기록이 없습니다. 먼저 기록을 작성하거나 샘플을 채워주세요!');
      return;
    }

    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `예워니_맘마기록_${today}.xlsx`;

    // 엑셀 시트용 데이터 가공
    const excelRows = records.map(r => ({
      '기록일자': r.recordDate,
      '경과일': `D+${r.dDayCount}`,
      '단계': stageMap[r.stage] || r.stage,
      '처음먹은재료(NEW)': r.newIngredient || '',
      '이유식명': r.mealName,
      '이유식업체': r.mealBrand,
      '토핑재료': r.toppingName || '',
      '토핑업체': r.toppingBrand || '',
      '준비총량(g)': r.totalPreparedGram,
      '선택칸(0~5)': r.eatenFraction,
      '먹은양(g)': r.eatenGram,
      '수유량(ml)': r.nursingAmountMl,
      '알러지발생': r.hasAllergy ? '⚠️발생' : '정상',
      '알러지상세증상': r.allergySymptom || '',
      '특이사항메모': r.memo || ''
    }));

    if (typeof XLSX !== 'undefined') {
      try {
        const worksheet = XLSX.utils.json_to_sheet(excelRows);

        // 컬럼 너비 자동 설정
        const colWidths = [
          { wch: 12 }, // 일자
          { wch: 8 },  // D+
          { wch: 8 },  // 단계
          { wch: 16 }, // NEW
          { wch: 18 }, // 이유식명
          { wch: 14 }, // 업체
          { wch: 16 }, // 토핑
          { wch: 12 }, // 토핑업체
          { wch: 12 }, // 준비총량
          { wch: 10 }, // 선택칸
          { wch: 12 }, // 먹은양
          { wch: 12 }, // 수유량
          { wch: 12 }, // 알러지
          { wch: 25 }, // 증상
          { wch: 30 }  // 메모
        ];
        worksheet['!cols'] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, '예워니식단기록');

        XLSX.writeFile(workbook, filename);
        return;
      } catch (err) {
        console.warn('XLSX 내보내기 실패, CSV로 대체합니다:', err);
      }
    }

    // SheetJS 미지원 시 CSV로 폴백
    exportToCsv(records);
  }

  /**
   * CSV 내보내기 (Excel 호환 UTF-8 with BOM)
   * @param {Array} records 
   */
  function exportToCsv(records) {
    if (!records || records.length === 0) {
      alert('내보낼 식단 기록이 없습니다.');
      return;
    }

    const headers = [
      '기록일자',
      '경과일(D+)',
      '단계',
      '처음먹은재료(NEW)',
      '이유식명칭',
      '이유식업체',
      '토핑재료',
      '토핑업체',
      '준비총량(g)',
      '선택칸(0~5)',
      '섭취량(g)',
      '수유량(ml)',
      '알러지발생여부',
      '알러지상세증상',
      '메모'
    ];

    const escapeCsvField = (field) => {
      if (field === null || field === undefined) return '""';
      const str = String(field).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = records.map(r => [
      escapeCsvField(r.recordDate),
      escapeCsvField(`D+${r.dDayCount}`),
      escapeCsvField(stageMap[r.stage] || r.stage),
      escapeCsvField(r.newIngredient || ''),
      escapeCsvField(r.mealName),
      escapeCsvField(r.mealBrand),
      escapeCsvField(r.toppingName || ''),
      escapeCsvField(r.toppingBrand || ''),
      escapeCsvField(r.totalPreparedGram),
      escapeCsvField(r.eatenFraction),
      escapeCsvField(r.eatenGram),
      escapeCsvField(r.nursingAmountMl),
      escapeCsvField(r.hasAllergy ? '⚠️발생' : '정상'),
      escapeCsvField(r.allergySymptom || ''),
      escapeCsvField(r.memo || '')
    ].join(','));

    // UTF-8 BOM (\uFEFF) 추가하여 엑셀에서 바로 열었을 때 한글 깨짐 방지
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `예워니_맘마기록_${today}.csv`;

    downloadBlob(blob, filename);
  }

  /**
   * JSON 백업 파일 다운로드
   * @param {Array} records 
   */
  function exportToJson(records) {
    const backupData = {
      app: 'yewon_baby_food_tracker',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      recordCount: records.length,
      records: records
    };

    const jsonString = JSON.stringify(backupData, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const filename = `예워니_맘마백업_${today}.json`;

    downloadBlob(blob, filename);
  }

  /**
   * JSON 백업 파일 복원(가져오기)
   * @param {File} file 
   * @param {Function} onSuccess 
   * @param {Function} onError 
   */
  function importFromJson(file, onSuccess, onError) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const parsed = JSON.parse(e.target.result);
        let records = [];

        if (Array.isArray(parsed)) {
          records = parsed;
        } else if (parsed && Array.isArray(parsed.records)) {
          records = parsed.records;
        } else {
          throw new Error('유효한 백업 데이터 형식이 아닙니다.');
        }

        if (onSuccess) onSuccess(records);
      } catch (err) {
        if (onError) onError(err);
      }
    };
    reader.readAsText(file);
  }

  /**
   * 소아과 진료용 리포트 인쇄 모드 실행
   * @param {Array} records 
   */
  function printClinicReport(records) {
    if (!records || records.length === 0) {
      alert('인쇄할 식단 기록이 없습니다.');
      return;
    }

    let printContainer = document.getElementById('clinicPrintArea');
    if (!printContainer) {
      printContainer = document.createElement('div');
      printContainer.id = 'clinicPrintArea';
      document.body.appendChild(printContainer);
    }

    const todayStr = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric'
    });

    const allergies = records.filter(r => r.hasAllergy);
    const newIngredients = [...new Set(records.map(r => r.newIngredient).filter(Boolean))];

    let tableRows = records.map(r => `
      <tr class="${r.hasAllergy ? 'print-allergy-row' : ''}">
        <td>${r.recordDate} (D+${r.dDayCount})</td>
        <td>${stageMap[r.stage] || r.stage}</td>
        <td><strong>${r.mealName}</strong> ${r.mealBrand ? `<br><small>(${r.mealBrand})</small>` : ''}</td>
        <td>${r.newIngredient ? `<span class="print-new-badge">NEW ${r.newIngredient}</span>` : '-'}</td>
        <td><strong>${r.eatenGram}g</strong> / ${r.totalPreparedGram}g (${r.eatenFraction * 20}%)</td>
        <td>${r.nursingAmountMl}ml</td>
        <td>
          ${r.hasAllergy 
            ? `<strong class="print-allergy-text">⚠️ 발생: ${r.allergySymptom || '이상반응'}</strong>` 
            : '<span style="color:#888;">정상</span>'}
        </td>
        <td>${r.memo || '-'}</td>
      </tr>
    `).join('');

    printContainer.innerHTML = `
      <div class="print-page">
        <div class="print-header">
          <h1>🏥 [소아청소년과 진료 참고용] 예원이 이유식 및 알러지 반응 경과 보고서</h1>
          <p class="print-meta">출력일자: ${todayStr} | 환아: 조카 예원 (출생: 2026.05.11 / D+${records[0]?.dDayCount || 165}일 기준)</p>
        </div>

        <div class="print-summary-box">
          <div class="summary-col">
            <strong>총 관찰 일수:</strong> ${records.length}회 급여 기록
          </div>
          <div class="summary-col">
            <strong>시도한 신규 식재료:</strong> ${newIngredients.join(', ') || '없음'}
          </div>
          <div class="summary-col allergy-highlight">
            <strong>⚠️ 알러지 이상 징후:</strong> 총 ${allergies.length}건 보고
          </div>
        </div>

        ${allergies.length > 0 ? `
          <div class="print-allergy-summary">
            <h3>🚨 진료 필수 확인: 알러지 의심 내역 요약</h3>
            <ul>
              ${allergies.map(a => `
                <li><strong>${a.recordDate} (${a.mealName})</strong> : [NEW재료: ${a.newIngredient || '기존'}] &rarr; <span class="print-allergy-text">${a.allergySymptom}</span></li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <table class="print-table">
          <thead>
            <tr>
              <th style="width:13%">날짜(D+)</th>
              <th style="width:7%">단계</th>
              <th style="width:18%">이유식명(업체)</th>
              <th style="width:12%">신규재료</th>
              <th style="width:13%">섭취량/총량</th>
              <th style="width:9%">수유량</th>
              <th style="width:16%">알러지 이상 여부</th>
              <th style="width:12%">특이사항</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>

        <div class="print-footer">
          <p>※ 본 리포트는 '예워니 맘마기록' 앱에서 작성된 실시간 이유식 일지 데이터입니다.</p>
        </div>
      </div>
    `;

    window.print();
  }

  /**
   * 브라우저 호환 안전한 Blob 다운로드 함수
   */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1500);
  }

  return {
    exportToExcel,
    exportToCsv,
    exportToJson,
    importFromJson,
    printClinicReport
  };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Exporter;
} else if (typeof window !== 'undefined') {
  window.Exporter = Exporter;
}
