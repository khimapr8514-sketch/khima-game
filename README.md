# 메디컬 레코드 타이쿤 (프로토타입)

보건의료정보관리사 직종 홍보용 웹 타이쿤 게임. 기획서는 [PLAN.md](PLAN.md) 참고.

## 실행

```bash
npm install
npm run dev     # http://localhost:5173
npm run build   # dist/ 에 배포용 정적 빌드
```

## 구조

- `src/data/gameData.ts` — 진단명/코드, 미비 사유, 직업 정보 카드, 밸런싱 상수 (콘텐츠는 여기서만 수정)
- `src/scenes/TitleScene.ts` — 타이틀 화면
- `src/scenes/GameScene.ts` — 코어 루프: 차트 대기열 → 검토(반송/코딩) → 하루 결산

## 아트 에셋 (M3 예정)

WSL의 `~/game-assets-pipeline` (fal.ai)으로 픽셀아트 생성 후 `public/assets/`에 복사.
