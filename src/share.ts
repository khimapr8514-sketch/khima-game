// 결과 공유 카드 — 캔버스로 그려서 PNG 다운로드

export interface ResultCardData {
  day: number;
  grade: string;
  money: number;
  rep: number;
  accuracy: number;
  hero?: HTMLImageElement | null;
}

export function downloadResultCard(data: ResultCardData) {
  const W = 800;
  const H = 418; // 1.91:1 (SNS 공유 비율)
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const x = c.getContext('2d');
  if (!x) return;

  // 배경
  const grad = x.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, '#16202c');
  grad.addColorStop(1, '#1e3a5c');
  x.fillStyle = grad;
  x.fillRect(0, 0, W, H);
  x.strokeStyle = '#2e86de';
  x.lineWidth = 6;
  x.strokeRect(8, 8, W - 16, H - 16);

  // 주인공 일러스트 (오른쪽)
  if (data.hero) {
    x.save();
    x.fillStyle = '#ffffff';
    x.fillRect(560, 88, 200, 200);
    x.drawImage(data.hero, 566, 94, 188, 188);
    x.restore();
    x.fillStyle = '#c8d8e8';
    x.font = 'bold 15px sans-serif';
    x.textAlign = 'center';
    x.fillText('보건의료정보관리사', 660, 312);
  }

  x.textAlign = 'left';
  x.fillStyle = '#ffd97b';
  x.font = 'bold 30px sans-serif';
  x.fillText('메디컬 레코드 타이쿤', 48, 76);

  x.fillStyle = '#ffffff';
  x.font = 'bold 40px sans-serif';
  x.fillText(`🏥 ${data.grade}`, 48, 150);

  x.fillStyle = '#c8d8e8';
  x.font = '24px sans-serif';
  x.fillText(`${data.day}일차 근무 중`, 48, 196);
  x.fillText(`💰 자금 ₩${data.money.toLocaleString()}`, 48, 236);
  x.fillText(`⭐ 평판 ${data.rep} · 정확도 ${data.accuracy}%`, 48, 276);

  x.fillStyle = '#9fd0b8';
  x.font = '18px sans-serif';
  x.fillText('병원 의무기록을 지키는 직업, 보건의료정보관리사 체험 게임', 48, 356);
  x.fillStyle = '#6f8aa5';
  x.font = '16px sans-serif';
  x.fillText('대한보건의료정보관리사협회', 48, 384);

  c.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medical-record-tycoon.png';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  });
}
