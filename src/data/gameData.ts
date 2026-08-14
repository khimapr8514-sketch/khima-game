// 게임 콘텐츠 데이터 — 코드 수정 없이 여기만 고쳐서 콘텐츠 추가/밸런싱
// 질병 코드는 실제 KCD가 아닌 게임용 가상 코드(교육 부담 회피, PLAN.md 참고)

export type ChartKind = 'normal' | 'cancer' | 'infection';

export interface Diagnosis {
  name: string;
  code: string;
}

export const DIAGNOSES: Diagnosis[] = [
  { name: '급성 상기도 감염(감기)', code: 'GH-101' },
  { name: '위염', code: 'GH-204' },
  { name: '발목 염좌', code: 'GH-317' },
  { name: '편두통', code: 'GH-422' },
  { name: '고혈압', code: 'GH-518' },
  { name: '제2형 당뇨병', code: 'GH-609' },
  { name: '급성 충수염(맹장염)', code: 'GH-733' },
  { name: '요로 감염', code: 'GH-812' },
  { name: '알레르기 비염', code: 'GH-926' },
  { name: '어깨 회전근개 손상', code: 'GH-345' },
];

// 암 차트 — 코딩 전에 "암등록"이 필요 (병원 등급부터 등장)
export const CANCER_DIAGNOSES: Diagnosis[] = [
  { name: '위암', code: 'GC-110' },
  { name: '폐암', code: 'GC-220' },
  { name: '유방암', code: 'GC-330' },
  { name: '대장암', code: 'GC-440' },
];

// 법정감염병 차트 — 제한시간 내 보건소 신고 필요 (종합병원 등급부터 등장)
export const INFECTION_DIAGNOSES: Diagnosis[] = [
  { name: '수두', code: 'GI-410' },
  { name: '홍역', code: 'GI-520' },
  { name: '결핵', code: 'GI-630' },
  { name: 'A형 간염', code: 'GI-740' },
];

// 미비기록 사유 (반송해야 하는 차트)
export const INCOMPLETE_REASONS: string[] = [
  '의사 서명 누락',
  '퇴원요약지 미작성',
  '수술기록지 누락',
  '경과기록 미기재',
];

export const PATIENT_NAMES: string[] = [
  '김하늘', '이준서', '박서연', '최민준', '정다은',
  '강지호', '윤소율', '임도윤', '한예린', '오시우',
];

// ── 사본발급 민원 시나리오 ─────────────────────────────────────
// valid: true → 발급해야 정답 / false → 거절해야 정답
export interface CopyRequest {
  who: string;
  docs: string[];
  valid: boolean;
  problem?: string; // 개인정보보호 교육 구매 시 힌트로 표시
}

export const COPY_REQUESTS: CopyRequest[] = [
  { who: '환자 본인', docs: ['본인 신분증'], valid: true },
  { who: '환자의 자녀', docs: ['대리인 신분증', '환자 자필 위임장', '환자 신분증 사본'], valid: true },
  { who: '경찰관', docs: ['수사 공문(영장)'], valid: true },
  { who: '환자 본인', docs: ['본인 신분증', '진료비 영수증'], valid: true },
  { who: '환자의 배우자', docs: ['대리인 신분증', '위임장 없음'], valid: false, problem: '위임장 미지참 — 가족이라도 위임장이 필요해요' },
  { who: '보험회사 직원', docs: ['회사 사원증', '환자 동의서 없음'], valid: false, problem: '환자 동의서 없이는 제3자 발급 불가' },
  { who: '환자 본인(주장)', docs: ['기한 만료된 신분증'], valid: false, problem: '유효한 신분증이 아님 — 본인 확인 불가' },
  { who: '환자의 직장 상사', docs: ['명함', '"병문안 왔다가 궁금해서"'], valid: false, problem: '아무 권한 없는 제3자 — 절대 발급 금지!' },
];

// ── 투자 상점 ────────────────────────────────────────────────
export interface Upgrade {
  id: 'staff' | 'coffee' | 'emr' | 'privacy';
  name: string;
  desc: string;
  cost: number;
  max: number;
}

export const UPGRADES: Upgrade[] = [
  { id: 'staff', name: '👩‍💼 신입 관리사 고용', desc: '매일 아침 차트 1건을\n자동으로 정확하게 처리', cost: 600, max: 3 },
  { id: 'coffee', name: '☕ 커피머신 설치', desc: '하루 업무 시간 +10초', cost: 400, max: 1 },
  { id: 'emr', name: '💻 EMR 업그레이드', desc: '코딩 선택지가 3개 → 2개로\n(자동 추천 기능)', cost: 800, max: 1 },
  { id: 'privacy', name: '🔒 개인정보보호 교육', desc: '사본발급 민원에서\n문제점 힌트 표시', cost: 500, max: 1 },
];

// ── 병원 등급 (누적 수익 기준) ────────────────────────────────
export interface Grade {
  name: string;
  need: number; // 누적 수익 기준
  unlock?: string; // 등급업 시 안내 문구
}

export const GRADES: Grade[] = [
  { name: '의원', need: 0 },
  { name: '병원', need: 2000, unlock: '🎗 암 환자 차트가 등장합니다 — 코딩 전에 암등록을 잊지 마세요!' },
  { name: '종합병원', need: 5000, unlock: '🚨 법정감염병 차트가 등장합니다 — 제한시간 내 보건소에 신고하세요!' },
  { name: '상급종합병원', need: 9000, unlock: '🏆 최고 등급 달성! 당신은 대한민국 최고의 보건의료정보관리사입니다!' },
];

// 하루 결산 화면에 번갈아 나오는 직업 정보 카드
export const JOB_FACTS: string[] = [
  '보건의료정보관리사는 의무기록의 빠진 부분(미비기록)을 찾아\n의사에게 보완을 요청하는 기록 품질 관리자예요.',
  '진단명을 표준 질병분류 코드로 바꾸는 "코딩"은\n병원 수익(보험청구)과 국가 보건통계의 기초가 됩니다.',
  '코딩이 틀리면 건강보험 청구가 "삭감"되어\n병원이 진료비를 제대로 받지 못해요.',
  '의무기록 사본은 아무나 뗄 수 없어요.\n본인 확인·위임장 검토도 보건의료정보관리사의 일입니다.',
  '병원의 암 환자 정보는 국가 암등록사업으로 모여\n국가 암 통계와 연구의 기반이 됩니다.',
  '법정감염병은 정해진 기한 안에 보건소에 신고해야 해요.\n신고가 늦으면 과태료가 부과될 수 있습니다.',
  '의료기관 인증평가에서 의무기록의 질은 핵심 평가 항목!\n기록 미비율 관리가 병원의 등급을 좌우해요.',
  '보건의료정보관리사는 국가면허 보건의료인으로,\n전국의 모든 병원급 의료기관에서 일하고 있어요.',
];

// ── 밸런싱 상수 ──────────────────────────────────────────────
export const BALANCE = {
  daySeconds: 60,
  startCharts: 5,
  chartsPerDayGrowth: 2, // 매일 +N건
  incompleteRate: 0.35, // 미비기록 비율
  cancerRate: 0.2, // (병원 등급↑) 암 차트 비율
  infectionRate: 0.15, // (종합병원 등급↑) 감염병 차트 비율
  infectionSeconds: 20, // 감염병 신고 제한시간

  payCorrectCoding: 120, // 정확 코딩 수익
  payReturnIncomplete: 60, // 미비 반송 처리 수익(기록 품질 기여)
  payCancerBonus: 100, // 암등록 보너스 (정확 코딩 수익에 추가)
  payInfectionReport: 150, // 감염병 신고 수익
  payCopyCorrect: 100, // 사본발급 민원 올바른 응대

  penaltyWrongCode: 80, // 잘못된 코드 → 삭감
  penaltyClaimIncomplete: 100, // 미비기록을 그냥 청구 → 삭감
  penaltyReturnComplete: 40, // 멀쩡한 차트 반송 → 의사 불만
  penaltyCancerMissed: 100, // 암등록 누락
  penaltyInfectionMissed: 120, // 감염병 신고 기한 초과
  penaltyCopyLeak: 150, // 부적격자에게 사본 발급 (개인정보 유출)

  repGain: 2,
  repLoss: 5,
  repLossUnprocessed: 3, // 미처리 차트 1건당 평판 감소
  repCopyCorrect: 3,
  repCopyLeak: 8,
  repCopyRefuseValid: 3, // 정당한 요청 거절
  repCopyIgnored: 2, // 민원 무응답

  copyFirstDelay: [12, 25] as [number, number], // 민원 등장 시점(초, 범위)
  copySecondDelay: [35, 45] as [number, number], // 종합병원 등급부터 두 번째 민원
  copyPatience: 15, // 민원인 대기 시간(초)

  auditEvery: 4, // N일마다 인증평가
  auditMaxMistakes: 1, // 통과 기준: 하루 실수 허용치
  auditReward: 300,
  auditRepGain: 15,
  auditRepLoss: 15,
};
