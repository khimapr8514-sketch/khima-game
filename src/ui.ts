// UI 스케일 — 모바일(터치 기기·낮은 화면)에서는 글씨를 키워 가독성 확보
// 게임 해상도(960x540)가 작은 화면에 맞춰 축소되므로 폰트를 미리 키워둔다

export const UI_SCALE = (() => {
  if (typeof window === 'undefined') return 1;
  const coarse = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  const shortScreen = window.innerHeight <= 520; // 가로 모드 폰
  return coarse || shortScreen ? 1.3 : 1;
})();

/** fontSize 헬퍼: 기준 px → 스케일 적용된 px 문자열 */
export function fs(base: number): string {
  return `${Math.round(base * UI_SCALE)}px`;
}
