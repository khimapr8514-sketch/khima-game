# 메디컬 레코드 타이쿤

보건의료정보관리사 직종 홍보용 웹 타이쿤 게임. 기획서는 [PLAN.md](PLAN.md) 참고.

**🎮 플레이:** https://khimapr8514-sketch.github.io/khima-game/

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

## 아트/사운드 에셋

- 이미지·BGM: WSL의 `~/game-assets-pipeline` (fal.ai flux/dev, stable-audio)으로 생성 후 `public/assets/`에 복사
- 효과음: `src/sound.ts`에서 WebAudio로 합성 (외부 파일 없음)

## 배포

```bash
npm run build
npx gh-pages -d dist
```

GitHub Pages (`gh-pages` 브랜치) → https://khimapr8514-sketch.github.io/khima-game/
