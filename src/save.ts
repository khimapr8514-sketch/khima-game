// 게임 진행 자동 저장 — 매일 아침(startDay) 시점 스냅샷을 localStorage에 기록

export interface SaveData {
  day: number;
  money: number;
  rep: number;
  totalEarned: number;
  gradeIdx: number;
  owned: Record<string, number>;
  chartSeq: number;
}

const KEY = 'khima_save_v1';

export function writeSave(data: SaveData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // 저장 실패(사생활 모드 등)해도 게임은 계속
  }
}

export function readSave(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as SaveData;
    if (typeof d.day !== 'number' || d.day < 1 || typeof d.money !== 'number') return null;
    return d;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // 무시
  }
}
