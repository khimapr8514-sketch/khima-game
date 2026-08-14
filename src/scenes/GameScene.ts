import Phaser from 'phaser';
import {
  BALANCE, CANCER_DIAGNOSES, COPY_REQUESTS, DIAGNOSES, GRADES, INCOMPLETE_REASONS,
  INFECTION_DIAGNOSES, JOB_FACTS, PATIENT_NAMES, UPGRADES,
  ChartKind, CopyRequest, Diagnosis,
} from '../data/gameData';
import { hasAsset, playBgm, queueAssets } from '../assetLoader';
import { isMuted, setMuted, sfx } from '../sound';
import { downloadResultCard } from '../share';

interface Chart {
  id: number;
  patient: string;
  age: number;
  kind: ChartKind;
  diagnosis: Diagnosis;
  incomplete: boolean;
  reason?: string;
  reportLeft?: number; // 감염병 신고 남은 시간(초)
}

const FONT = 'sans-serif';

export class GameScene extends Phaser.Scene {
  private day = 1;
  private money = 500;
  private rep = 50;
  private totalEarned = 0;
  private gradeIdx = 0;
  private timeLeft = BALANCE.daySeconds;
  private chartSeq = 0;
  private mistakes = 0; // 인증평가용 하루 실수 카운트
  private owned: Record<string, number> = { staff: 0, coffee: 0, emr: 0, privacy: 0 };

  private queue: Chart[] = [];
  private selected: Chart | null = null;
  private dayOver = false;

  // 하루 통계
  private stat = { processed: 0, correct: 0, wrong: 0, returned: 0 };

  private hud!: {
    day: Phaser.GameObjects.Text; time: Phaser.GameObjects.Text; money: Phaser.GameObjects.Text;
    rep: Phaser.GameObjects.Text; grade: Phaser.GameObjects.Text; audit: Phaser.GameObjects.Text;
  };
  private queuePanel!: Phaser.GameObjects.Container;
  private workPanel!: Phaser.GameObjects.Container;
  private popup!: Phaser.GameObjects.Container;
  private overlay!: Phaser.GameObjects.Container;
  private timerEvent!: Phaser.Time.TimerEvent;
  private copyEvents: Phaser.Time.TimerEvent[] = [];
  private popupTimeout?: Phaser.Time.TimerEvent;

  constructor() {
    super('Game');
  }

  preload() {
    queueAssets(this);
  }

  create() {
    if (hasAsset(this, 'bg_game')) {
      this.add.image(480, 270, 'bg_game').setDisplaySize(960, 540).setAlpha(0.45);
    }
    playBgm(this, isMuted());
    this.day = 1;
    this.money = 500;
    this.rep = 50;
    this.totalEarned = 0;
    this.gradeIdx = 0;
    this.owned = { staff: 0, coffee: 0, emr: 0, privacy: 0 };
    this.createHud();
    this.queuePanel = this.add.container(0, 0);
    this.workPanel = this.add.container(0, 0);
    this.popup = this.add.container(0, 0).setDepth(80);
    this.overlay = this.add.container(0, 0).setDepth(100);
    this.startDay();
  }

  private isAuditDay(): boolean {
    return this.day % BALANCE.auditEvery === 0;
  }

  // ── 하루 진행 ──────────────────────────────────────────────

  private startDay() {
    this.dayOver = false;
    this.timeLeft = BALANCE.daySeconds + this.owned.coffee * 10;
    this.stat = { processed: 0, correct: 0, wrong: 0, returned: 0 };
    this.mistakes = 0;
    this.selected = null;

    const count = BALANCE.startCharts + (this.day - 1) * BALANCE.chartsPerDayGrowth;
    this.queue = Array.from({ length: count }, () => this.makeChart());

    // 직원 자동 처리 (최소 1건은 남겨둠)
    const autoCount = Math.min(this.owned.staff, Math.max(0, this.queue.length - 1));
    for (let i = 0; i < autoCount; i++) this.autoProcessOne();
    if (autoCount > 0) this.toast(`👩‍💼 직원이 차트 ${autoCount}건을 처리해뒀어요!`, true);

    // 감염병 차트가 도착한 날은 경보음
    if (this.queue.some((c) => c.kind === 'infection')) sfx.alarm();

    // 사본발급 민원 예약 (2일차부터, 종합병원 등급부터 하루 2회)
    this.copyEvents.forEach((e) => e.remove());
    this.copyEvents = [];
    if (this.day >= 2) {
      const delays: [number, number][] = [BALANCE.copyFirstDelay];
      if (this.gradeIdx >= 2) delays.push(BALANCE.copySecondDelay);
      for (const [min, max] of delays) {
        this.copyEvents.push(this.time.addEvent({
          delay: Phaser.Math.Between(min, max) * 1000,
          callback: () => this.showCopyRequest(),
        }));
      }
    }

    this.timerEvent?.remove();
    this.timerEvent = this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => this.tick(),
    });

    this.updateHud();
    this.renderQueue();
    this.renderWorkPanel();
  }

  private tick() {
    if (this.dayOver) return;
    this.timeLeft--;

    // 감염병 신고 시한 진행
    let expired = false;
    let hasInfection = false;
    for (const c of this.queue) {
      if (c.kind === 'infection' && c.reportLeft !== undefined) {
        hasInfection = true;
        c.reportLeft--;
        if (c.reportLeft <= 0) expired = true;
      }
    }
    if (expired) {
      const gone = this.queue.filter((c) => c.kind === 'infection' && (c.reportLeft ?? 1) <= 0);
      this.queue = this.queue.filter((c) => !gone.includes(c));
      for (const c of gone) {
        this.mistakes++;
        this.money -= BALANCE.penaltyInfectionMissed;
        this.rep = Phaser.Math.Clamp(this.rep - BALANCE.repLoss, 0, 100);
        if (this.selected?.id === c.id) this.selected = null;
      }
      this.toast(`🚨 감염병 신고 기한을 놓쳤어요! 과태료 -₩${BALANCE.penaltyInfectionMissed}`, false);
      sfx.error();
      this.renderWorkPanel();
    }

    this.updateHud();
    if (expired || hasInfection) this.renderQueue();

    if (this.timeLeft <= 0) {
      this.endDay();
    } else if (this.queue.length === 0) {
      this.endDay();
    }
  }

  private endDay() {
    if (this.dayOver) return;
    this.dayOver = true;
    this.timerEvent.remove();
    this.copyEvents.forEach((e) => e.remove());
    this.popupTimeout?.remove();
    this.popup.removeAll(true);

    const unprocessed = this.queue.length;
    this.rep = Phaser.Math.Clamp(this.rep - unprocessed * BALANCE.repLossUnprocessed, 0, 100);

    // 인증평가 판정
    let auditResult: 'pass' | 'fail' | null = null;
    if (this.isAuditDay()) {
      if (this.mistakes <= BALANCE.auditMaxMistakes) {
        auditResult = 'pass';
        this.gain(BALANCE.auditReward);
        this.rep = Phaser.Math.Clamp(this.rep + BALANCE.auditRepGain, 0, 100);
      } else {
        auditResult = 'fail';
        this.rep = Phaser.Math.Clamp(this.rep - BALANCE.auditRepLoss, 0, 100);
      }
    }

    // 병원 등급업 판정
    let gradeUp: string | null = null;
    while (this.gradeIdx < GRADES.length - 1 && this.totalEarned >= GRADES[this.gradeIdx + 1].need) {
      this.gradeIdx++;
      gradeUp = GRADES[this.gradeIdx].unlock ?? null;
    }

    this.selected = null;
    this.updateHud();
    this.renderQueue();
    this.renderWorkPanel();
    this.showDayResult(unprocessed, auditResult, gradeUp);
  }

  private makeChart(): Chart {
    let kind: ChartKind = 'normal';
    const r = Math.random();
    if (this.gradeIdx >= 2 && r < BALANCE.infectionRate) kind = 'infection';
    else if (this.gradeIdx >= 1 && r < BALANCE.infectionRate + BALANCE.cancerRate) kind = 'cancer';

    const pool = kind === 'cancer' ? CANCER_DIAGNOSES
      : kind === 'infection' ? INFECTION_DIAGNOSES : DIAGNOSES;
    const incomplete = kind === 'infection' ? false : Math.random() < BALANCE.incompleteRate;
    return {
      id: ++this.chartSeq,
      patient: Phaser.Utils.Array.GetRandom(PATIENT_NAMES),
      age: Phaser.Math.Between(5, 88),
      kind,
      diagnosis: Phaser.Utils.Array.GetRandom(pool),
      incomplete,
      reason: incomplete ? Phaser.Utils.Array.GetRandom(INCOMPLETE_REASONS) : undefined,
      reportLeft: kind === 'infection' ? BALANCE.infectionSeconds : undefined,
    };
  }

  private gain(amount: number) {
    this.money += amount;
    if (amount > 0) this.totalEarned += amount;
  }

  // 직원 자동 처리: 완성된 일반 차트 우선, 없으면 미비 차트 반송
  private autoProcessOne() {
    const target = this.queue.find((c) => c.kind === 'normal' && !c.incomplete)
      ?? this.queue.find((c) => c.incomplete);
    if (!target) return;
    this.queue = this.queue.filter((c) => c.id !== target.id);
    this.stat.processed++;
    if (target.incomplete) {
      this.stat.returned++;
      this.gain(BALANCE.payReturnIncomplete);
    } else {
      this.stat.correct++;
      this.gain(BALANCE.payCorrectCoding);
    }
  }

  // ── 차트 처리 로직 ─────────────────────────────────────────

  private resolveChart(chart: Chart, result: 'correct' | 'wrong' | 'returned', money: number, msg: string, good: boolean) {
    this.queue = this.queue.filter((c) => c.id !== chart.id);
    this.selected = null;
    this.stat.processed++;
    if (result === 'correct') this.stat.correct++;
    if (result === 'wrong') { this.stat.wrong++; this.mistakes++; }
    if (result === 'returned') this.stat.returned++;
    this.gain(money);
    this.rep = Phaser.Math.Clamp(this.rep + (good ? BALANCE.repGain : -BALANCE.repLoss), 0, 100);
    if (good) sfx.success(); else sfx.error();
    this.toast(msg, good);
    this.updateHud();
    this.renderQueue();
    this.renderWorkPanel();
    if (this.queue.length === 0) this.endDay();
  }

  private onReturn(chart: Chart) {
    if (chart.incomplete) {
      this.resolveChart(chart, 'returned', BALANCE.payReturnIncomplete,
        `잘했어요! ${chart.reason} 차트를 반송했습니다 +₩${BALANCE.payReturnIncomplete}`, true);
    } else {
      this.resolveChart(chart, 'wrong', -BALANCE.penaltyReturnComplete,
        `멀쩡한 차트를 반송했어요… 의사가 화났습니다 -₩${BALANCE.penaltyReturnComplete}`, false);
    }
  }

  private onCode(chart: Chart, code: string, registered: boolean) {
    if (chart.incomplete) {
      this.resolveChart(chart, 'wrong', -BALANCE.penaltyClaimIncomplete,
        `미비기록을 청구했다가 삭감됐어요! -₩${BALANCE.penaltyClaimIncomplete}`, false);
      return;
    }
    if (code !== chart.diagnosis.code) {
      this.resolveChart(chart, 'wrong', -BALANCE.penaltyWrongCode,
        `코드 오류로 삭감됐어요… -₩${BALANCE.penaltyWrongCode}`, false);
      return;
    }
    if (chart.kind === 'cancer' && !registered) {
      this.resolveChart(chart, 'wrong', BALANCE.payCorrectCoding - BALANCE.penaltyCancerMissed,
        `코딩은 맞았지만 암등록을 빠뜨렸어요! -₩${BALANCE.penaltyCancerMissed}`, false);
      return;
    }
    if (chart.kind === 'cancer') {
      const pay = BALANCE.payCorrectCoding + BALANCE.payCancerBonus;
      this.resolveChart(chart, 'correct', pay, `암등록 + 정확한 코딩! +₩${pay}`, true);
      return;
    }
    this.resolveChart(chart, 'correct', BALANCE.payCorrectCoding,
      `정확한 코딩! 청구 완료 +₩${BALANCE.payCorrectCoding}`, true);
  }

  private onReport(chart: Chart) {
    this.resolveChart(chart, 'correct', BALANCE.payInfectionReport,
      `보건소 신고 완료! 방역에 기여했어요 +₩${BALANCE.payInfectionReport}`, true);
  }

  // ── HUD ───────────────────────────────────────────────────

  private createHud() {
    this.add.rectangle(480, 24, 960, 48, 0x0d1420);
    const style = { fontFamily: FONT, fontSize: '17px', color: '#ffffff' };
    this.hud = {
      day: this.add.text(16, 14, '', style),
      time: this.add.text(120, 14, '', style),
      money: this.add.text(230, 14, '', style),
      rep: this.add.text(420, 14, '', style),
      grade: this.add.text(560, 14, '', { ...style, color: '#ffd97b' }),
      audit: this.add.text(740, 14, '', { ...style, color: '#ff8b8b' }),
    };

    const muteBtn = this.add.text(936, 24, isMuted() ? '🔇' : '🔊', {
      fontFamily: FONT, fontSize: '20px',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    muteBtn.on('pointerdown', () => {
      setMuted(!isMuted());
      this.sound.mute = isMuted();
      muteBtn.setText(isMuted() ? '🔇' : '🔊');
    });
  }

  private updateHud() {
    this.hud.day.setText(`📅 ${this.day}일차`);
    this.hud.time.setText(`⏰ ${Math.max(0, this.timeLeft)}초`);
    this.hud.time.setColor(this.timeLeft <= 10 ? '#ff6b6b' : '#ffffff');
    this.hud.money.setText(`💰 ₩${this.money.toLocaleString()}`);
    this.hud.rep.setText(`⭐ 평판 ${this.rep}`);
    this.hud.grade.setText(`🏥 ${GRADES[this.gradeIdx].name}`);
    this.hud.audit.setText(this.isAuditDay() && !this.dayOver ? '🔍 인증평가 중!' : '');
  }

  // ── 차트 대기열 (왼쪽) ─────────────────────────────────────

  private chartLabel(chart: Chart): { icon: string; sub: string; subColor: string } {
    if (chart.kind === 'cancer') return { icon: '🎗', sub: '암 환자 차트', subColor: '#e8b4ff' };
    if (chart.kind === 'infection') {
      return { icon: '🚨', sub: `감염병! 신고까지 ${chart.reportLeft}초`, subColor: '#ff8b8b' };
    }
    return { icon: '📄', sub: '클릭해서 검토하기', subColor: '#8aa2ba' };
  }

  private renderQueue() {
    this.queuePanel.removeAll(true);
    this.queuePanel.add(this.add.rectangle(180, 294, 340, 472, 0x1b2838));
    this.queuePanel.add(this.add.text(30, 66, `🗂 퇴원 차트 대기열 (${this.queue.length}건)`, {
      fontFamily: FONT, fontSize: '18px', color: '#9fb8d0', fontStyle: 'bold',
    }));

    const visible = this.queue.slice(0, 6);
    visible.forEach((chart, i) => {
      const y = 128 + i * 66;
      const isSel = this.selected?.id === chart.id;
      const base = chart.kind === 'infection' ? 0x5c2733 : chart.kind === 'cancer' ? 0x44275c : 0x27405c;
      const card = this.add.rectangle(180, y, 310, 58, isSel ? 0x2e86de : base)
        .setInteractive({ useHandCursor: true });
      card.on('pointerover', () => { if (this.selected?.id !== chart.id) card.setAlpha(0.8); });
      card.on('pointerout', () => card.setAlpha(1));
      card.on('pointerdown', () => {
        if (this.dayOver) return;
        sfx.paper();
        this.selected = chart;
        this.renderQueue();
        this.renderWorkPanel();
      });
      const info = this.chartLabel(chart);
      const label = this.add.text(45, y - 18, `${info.icon} 차트 #${chart.id}  ${chart.patient} (${chart.age}세)`, {
        fontFamily: FONT, fontSize: '16px', color: '#ffffff',
      });
      const sub = this.add.text(45, y + 4, info.sub, {
        fontFamily: FONT, fontSize: '13px', color: info.subColor,
      });
      this.queuePanel.add([card, label, sub]);
    });

    if (this.queue.length > 6) {
      this.queuePanel.add(this.add.text(180, 128 + 6 * 66 - 10, `…외 ${this.queue.length - 6}건 대기 중`, {
        fontFamily: FONT, fontSize: '14px', color: '#6f8aa5',
      }).setOrigin(0.5, 0));
    }
    if (this.queue.length === 0) {
      this.queuePanel.add(this.add.text(180, 280, '모든 차트 처리 완료! 🎉', {
        fontFamily: FONT, fontSize: '17px', color: '#7bd88f',
      }).setOrigin(0.5));
    }
  }

  // ── 작업 패널 (오른쪽) ─────────────────────────────────────

  private renderWorkPanel() {
    this.workPanel.removeAll(true);
    this.workPanel.add(this.add.rectangle(660, 294, 560, 472, 0x1b2838));

    const chart = this.selected;
    if (!chart) {
      this.workPanel.add(this.add.text(660, 280, '왼쪽에서 차트를 선택해 검토를 시작하세요', {
        fontFamily: FONT, fontSize: '18px', color: '#6f8aa5',
      }).setOrigin(0.5));
      return;
    }

    const icon = this.chartLabel(chart).icon;
    this.workPanel.add(this.add.text(400, 76, `${icon} 차트 #${chart.id} 검토`, {
      fontFamily: FONT, fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }));

    const missing = chart.incomplete;
    const lines = [
      `환자: ${chart.patient} (${chart.age}세)`,
      `진단명: ${chart.diagnosis.name}`,
      '',
      `기록 상태:`,
      `  · 입퇴원기록 ✓`,
      `  · 경과기록 ${missing && chart.reason === '경과기록 미기재' ? '✗ 미기재' : '✓'}`,
      `  · 퇴원요약지 ${missing && chart.reason === '퇴원요약지 미작성' ? '✗ 미작성' : '✓'}`,
      `  · 수술기록지 ${missing && chart.reason === '수술기록지 누락' ? '✗ 누락' : '✓'}`,
      `  · 의사 서명 ${missing && chart.reason === '의사 서명 누락' ? '✗ 누락' : '✓'}`,
    ];
    if (chart.kind === 'infection') {
      lines.push('', `⚠ 법정감염병 의심 — 신고 기한 ${chart.reportLeft}초!`);
    }
    this.workPanel.add(this.add.text(420, 112, lines.join('\n'), {
      fontFamily: FONT, fontSize: '15px', color: '#c8d8e8', lineSpacing: 4,
    }));

    // 행동 버튼 (차트 유형별)
    if (chart.kind === 'infection') {
      this.makeButton(this.workPanel, 540, 460, 220, 54, 0xc0632b, '↩ 의사에게 반송',
        () => this.onReturn(chart));
      this.makeButton(this.workPanel, 790, 460, 220, 54, 0xb03040, '🚨 보건소 신고',
        () => this.onReport(chart));
    } else if (chart.kind === 'cancer') {
      this.makeButton(this.workPanel, 540, 430, 220, 48, 0xc0632b, '↩ 의사에게 반송',
        () => this.onReturn(chart), '16px');
      this.makeButton(this.workPanel, 790, 430, 220, 48, 0x2e8b57, '⌨ 코딩 진행',
        () => this.renderCodingPanel(chart, false), '16px');
      this.makeButton(this.workPanel, 665, 492, 340, 48, 0x8e44ad, '🎗 암등록 후 코딩',
        () => this.renderCodingPanel(chart, true), '16px');
    } else {
      this.makeButton(this.workPanel, 540, 460, 220, 54, 0xc0632b, '↩ 의사에게 반송',
        () => this.onReturn(chart));
      this.makeButton(this.workPanel, 790, 460, 220, 54, 0x2e8b57, '⌨ 코딩 진행',
        () => this.renderCodingPanel(chart, false));
    }
  }

  private renderCodingPanel(chart: Chart, registered: boolean) {
    this.workPanel.removeAll(true);
    this.workPanel.add(this.add.rectangle(660, 294, 560, 472, 0x1b2838));
    const title = registered ? `🎗 암등록 완료 → 질병분류 코딩` : `⌨ 질병분류 코딩 — 차트 #${chart.id}`;
    this.workPanel.add(this.add.text(400, 80, title, {
      fontFamily: FONT, fontSize: '20px', color: '#ffffff', fontStyle: 'bold',
    }));
    this.workPanel.add(this.add.text(660, 150, `진단명: ${chart.diagnosis.name}`, {
      fontFamily: FONT, fontSize: '19px', color: '#ffd97b',
    }).setOrigin(0.5));
    this.workPanel.add(this.add.text(660, 190, '올바른 질병분류 코드를 선택하세요', {
      fontFamily: FONT, fontSize: '15px', color: '#8aa2ba',
    }).setOrigin(0.5));

    // 정답 1 + 오답 (EMR 업그레이드 시 오답 1개, 기본 2개)
    const pool = chart.kind === 'cancer' ? CANCER_DIAGNOSES : DIAGNOSES;
    const wrongPool = pool.filter((d) => d.code !== chart.diagnosis.code);
    const wrongCount = this.owned.emr > 0 ? 1 : 2;
    const options = Phaser.Utils.Array.Shuffle([
      chart.diagnosis,
      ...Phaser.Utils.Array.Shuffle([...wrongPool]).slice(0, wrongCount),
    ]);
    options.forEach((opt, i) => {
      this.makeButton(this.workPanel, 660, 250 + i * 70, 360, 56, 0x27405c,
        `${opt.code}  (${opt.name})`, () => this.onCode(chart, opt.code, registered), '16px');
    });
    if (this.owned.emr > 0) {
      this.workPanel.add(this.add.text(660, 250 + options.length * 70 - 20, '💻 EMR 자동 추천으로 선택지가 줄었어요', {
        fontFamily: FONT, fontSize: '13px', color: '#7bd88f',
      }).setOrigin(0.5));
    }

    this.makeButton(this.workPanel, 660, 490, 160, 40, 0x445060, '← 뒤로', () => this.renderWorkPanel(), '14px');
  }

  // ── 사본발급 민원 팝업 ─────────────────────────────────────

  private showCopyRequest() {
    if (this.dayOver) return;
    sfx.doorbell();
    const req: CopyRequest = Phaser.Utils.Array.GetRandom(COPY_REQUESTS);
    this.popup.removeAll(true);

    this.popup.add(this.add.rectangle(660, 290, 560, 400, 0x2c2440).setInteractive());
    this.popup.add(this.add.rectangle(660, 116, 560, 52, 0x1f1830));
    this.popup.add(this.add.text(660, 116, '🪪 사본발급 민원이 도착했어요!', {
      fontFamily: FONT, fontSize: '19px', color: '#ffd97b', fontStyle: 'bold',
    }).setOrigin(0.5));

    this.popup.add(this.add.text(660, 168, `“의무기록 사본을 발급해 주세요.”`, {
      fontFamily: FONT, fontSize: '16px', color: '#ffffff',
    }).setOrigin(0.5));
    this.popup.add(this.add.text(660, 200, `— ${req.who}`, {
      fontFamily: FONT, fontSize: '15px', color: '#c8b8e8',
    }).setOrigin(0.5));

    let docX = 430;
    if (hasAsset(this, 'char_visitor')) {
      this.popup.add(this.add.rectangle(462, 285, 118, 118, 0xffffff));
      this.popup.add(this.add.image(462, 285, 'char_visitor').setDisplaySize(110, 110));
      docX = 545;
    }
    const docLines = req.docs.map((d) => `  · ${d}`).join('\n');
    this.popup.add(this.add.text(docX, 230, `제출한 서류:\n${docLines}`, {
      fontFamily: FONT, fontSize: '15px', color: '#c8d8e8', lineSpacing: 6,
    }));

    if (this.owned.privacy > 0 && req.problem) {
      this.popup.add(this.add.text(660, 360, `🔒 교육 힌트: ${req.problem}`, {
        fontFamily: FONT, fontSize: '13px', color: '#ff9b9b',
        wordWrap: { width: 520 },
      }).setOrigin(0.5));
    } else if (this.owned.privacy > 0) {
      this.popup.add(this.add.text(660, 360, '🔒 교육 힌트: 서류에 문제가 없어 보여요', {
        fontFamily: FONT, fontSize: '13px', color: '#9fd0b8',
      }).setOrigin(0.5));
    }

    this.makeButton(this.popup, 540, 430, 210, 52, 0x2e8b57, '✅ 발급해주기', () => this.onCopyAnswer(req, true));
    this.makeButton(this.popup, 785, 430, 210, 52, 0xb03040, '⛔ 거절하기', () => this.onCopyAnswer(req, false));

    // 민원인 인내심 시간 초과 시 자동 퇴장
    this.popupTimeout?.remove();
    this.popupTimeout = this.time.addEvent({
      delay: BALANCE.copyPatience * 1000,
      callback: () => {
        this.popup.removeAll(true);
        this.rep = Phaser.Math.Clamp(this.rep - BALANCE.repCopyIgnored, 0, 100);
        sfx.sad();
        this.toast(`민원인이 기다리다 그냥 갔어요… 평판 -${BALANCE.repCopyIgnored}`, false);
        this.updateHud();
      },
    });
  }

  private onCopyAnswer(req: CopyRequest, issued: boolean) {
    this.popupTimeout?.remove();
    this.popup.removeAll(true);
    if (issued === req.valid) {
      this.gain(BALANCE.payCopyCorrect);
      this.rep = Phaser.Math.Clamp(this.rep + BALANCE.repCopyCorrect, 0, 100);
      sfx.success();
      this.toast(issued
        ? `올바른 발급! 확인 절차 완벽했어요 +₩${BALANCE.payCopyCorrect}`
        : `올바른 거절! 개인정보를 지켰어요 +₩${BALANCE.payCopyCorrect}`, true);
    } else if (issued) {
      this.mistakes++;
      this.money -= BALANCE.penaltyCopyLeak;
      this.rep = Phaser.Math.Clamp(this.rep - BALANCE.repCopyLeak, 0, 100);
      sfx.error();
      this.toast(`개인정보 유출 사고! ${req.problem ?? '발급 요건 미충족'} -₩${BALANCE.penaltyCopyLeak}`, false);
    } else {
      this.rep = Phaser.Math.Clamp(this.rep - BALANCE.repCopyRefuseValid, 0, 100);
      sfx.sad();
      this.toast(`정당한 요청을 거절했어요… 민원 접수 평판 -${BALANCE.repCopyRefuseValid}`, false);
    }
    this.updateHud();
  }

  // ── 하루 결산 & 투자 상점 ──────────────────────────────────

  private showDayResult(unprocessed: number, auditResult: 'pass' | 'fail' | null, gradeUp: string | null) {
    if (gradeUp || auditResult === 'pass') sfx.fanfare();
    else if (auditResult === 'fail' || this.rep <= 0) sfx.sad();
    else sfx.chime();
    this.overlay.removeAll(true);
    this.overlay.add(this.add.rectangle(480, 270, 960, 540, 0x000000, 0.75).setInteractive());
    this.overlay.add(this.add.rectangle(480, 270, 620, 460, 0x1b2838));

    this.overlay.add(this.add.text(480, 70, `📊 ${this.day}일차 업무 결산`, {
      fontFamily: FONT, fontSize: '25px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));

    const s = this.stat;
    const acc = s.processed > 0 ? Math.round(((s.correct + s.returned) / s.processed) * 100) : 0;
    const rows = [
      `처리한 차트: ${s.processed}건  (미처리 ${unprocessed}건)`,
      `정확: ${s.correct + s.returned}건 · 실수: ${s.wrong}건 · 정확도 ${acc}%`,
      `💰 자금 ₩${this.money.toLocaleString()}  ⭐ 평판 ${this.rep}  🏥 ${GRADES[this.gradeIdx].name}`,
    ];
    this.overlay.add(this.add.text(480, 108, rows.join('\n'), {
      fontFamily: FONT, fontSize: '16px', color: '#c8d8e8', align: 'center', lineSpacing: 8,
    }).setOrigin(0.5, 0));

    let y = 210;
    if (auditResult) {
      const pass = auditResult === 'pass';
      this.overlay.add(this.add.rectangle(480, y, 540, 46, pass ? 0x1f4a30 : 0x4a1f28));
      this.overlay.add(this.add.text(480, y, pass
        ? `🔍 인증평가 통과! 보너스 +₩${BALANCE.auditReward}, 평판 +${BALANCE.auditRepGain}`
        : `🔍 인증평가 탈락… 실수 ${this.mistakes}건 (허용 ${BALANCE.auditMaxMistakes}건), 평판 -${BALANCE.auditRepLoss}`, {
        fontFamily: FONT, fontSize: '15px', color: pass ? '#7bd88f' : '#ff8b8b', fontStyle: 'bold',
      }).setOrigin(0.5));
      y += 56;
    }
    if (gradeUp) {
      this.overlay.add(this.add.rectangle(480, y, 540, 46, 0x4a3d1f));
      this.overlay.add(this.add.text(480, y, `🏥 병원 등급 상승 → ${GRADES[this.gradeIdx].name}!`, {
        fontFamily: FONT, fontSize: '16px', color: '#ffd97b', fontStyle: 'bold',
      }).setOrigin(0.5));
      y += 40;
      this.overlay.add(this.add.text(480, y, gradeUp, {
        fontFamily: FONT, fontSize: '13px', color: '#e8d8a8',
      }).setOrigin(0.5));
      y += 40;
    }

    // 직업 정보 카드
    const factY = Math.max(y + 30, 350);
    this.overlay.add(this.add.rectangle(480, factY, 540, 76, 0x24354a));
    this.overlay.add(this.add.text(480, factY,
      `💡 실제로는 이런 일이에요\n${JOB_FACTS[(this.day - 1) % JOB_FACTS.length]}`, {
      fontFamily: FONT, fontSize: '13px', color: '#9fd0b8', align: 'center', lineSpacing: 5,
    }).setOrigin(0.5));

    // 다음 인증평가 예고
    if (!this.isAuditDay() && (this.day + 1) % BALANCE.auditEvery === 0 && this.rep > 0) {
      this.overlay.add(this.add.text(480, factY + 56, `⚠ 내일은 의료기관 인증평가일! 실수를 ${BALANCE.auditMaxMistakes}건 이하로 줄이세요!`, {
        fontFamily: FONT, fontSize: '14px', color: '#ffb86b', fontStyle: 'bold',
      }).setOrigin(0.5));
    }

    const acc2 = s.processed > 0 ? Math.round(((s.correct + s.returned) / s.processed) * 100) : 0;
    const shareNow = () => {
      sfx.click();
      const heroSrc = hasAsset(this, 'char_hero')
        ? (this.textures.get('char_hero').getSourceImage() as HTMLImageElement)
        : null;
      downloadResultCard({
        day: this.day, grade: GRADES[this.gradeIdx].name,
        money: this.money, rep: this.rep, accuracy: acc2, hero: heroSrc,
      });
      this.toast('📸 결과 카드를 저장했어요! SNS에 자랑해 보세요', true);
    };

    if (this.rep <= 0) {
      this.overlay.add(this.add.text(480, 448, '평판이 바닥났습니다… 병원에서 해고됐어요 😢', {
        fontFamily: FONT, fontSize: '15px', color: '#ff6b6b',
      }).setOrigin(0.5));
      this.makeButton(this.overlay, 300, 483, 180, 38, 0x445060, '📸 결과 카드 저장', shareNow, '14px');
      this.makeButton(this.overlay, 540, 483, 220, 38, 0x2e86de, '다시 도전하기', () => {
        this.overlay.removeAll(true);
        this.scene.restart();
      });
    } else {
      this.makeButton(this.overlay, 270, 465, 180, 46, 0x445060, '📸 결과 카드 저장', shareNow, '14px');
      this.makeButton(this.overlay, 540, 465, 280, 46, 0x2e86de, '🛒 투자하고 출근 준비 →', () => this.showShop());
    }
  }

  private showShop() {
    this.overlay.removeAll(true);
    this.overlay.add(this.add.rectangle(480, 270, 960, 540, 0x000000, 0.75).setInteractive());
    this.overlay.add(this.add.rectangle(480, 270, 620, 460, 0x1b2838));

    this.overlay.add(this.add.text(480, 72, '🛒 투자 상점', {
      fontFamily: FONT, fontSize: '24px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5));
    this.overlay.add(this.add.text(480, 106, `보유 자금: ₩${this.money.toLocaleString()}`, {
      fontFamily: FONT, fontSize: '16px', color: '#ffd97b',
    }).setOrigin(0.5));

    const positions: [number, number][] = [[338, 195], [622, 195], [338, 320], [622, 320]];
    UPGRADES.forEach((up, i) => {
      const [x, y] = positions[i];
      const count = this.owned[up.id];
      const soldOut = count >= up.max;
      const card = this.add.rectangle(x, y, 272, 110, soldOut ? 0x223042 : 0x27405c)
        .setInteractive({ useHandCursor: !soldOut });
      if (!soldOut) {
        card.on('pointerover', () => card.setAlpha(0.85));
        card.on('pointerout', () => card.setAlpha(1));
        card.on('pointerdown', () => {
          if (this.money < up.cost) {
            sfx.sad();
            this.toast('자금이 부족해요!', false);
            return;
          }
          sfx.coin();
          this.money -= up.cost;
          this.owned[up.id]++;
          this.updateHud();
          this.showShop();
        });
      }
      this.overlay.add(card);
      this.overlay.add(this.add.text(x, y - 38, up.name, {
        fontFamily: FONT, fontSize: '15px', color: soldOut ? '#7a8a9a' : '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5));
      this.overlay.add(this.add.text(x, y - 4, up.desc, {
        fontFamily: FONT, fontSize: '12px', color: soldOut ? '#5a6a7a' : '#a8c0d8', align: 'center', lineSpacing: 3,
      }).setOrigin(0.5));
      this.overlay.add(this.add.text(x, y + 38,
        soldOut ? `보유 완료 (${count}/${up.max})` : `₩${up.cost.toLocaleString()}  (보유 ${count}/${up.max})`, {
        fontFamily: FONT, fontSize: '13px', color: soldOut ? '#7bd88f' : '#ffd97b',
      }).setOrigin(0.5));
    });

    this.makeButton(this.overlay, 480, 462, 260, 48, 0x2e86de, `${this.day + 1}일차 출근하기 →`, () => {
      this.overlay.removeAll(true);
      this.day++;
      this.startDay();
    });
  }

  // ── 공용 UI 헬퍼 ───────────────────────────────────────────

  private makeButton(
    parent: Phaser.GameObjects.Container,
    x: number, y: number, w: number, h: number,
    color: number, label: string, onClick: () => void, fontSize = '18px',
  ) {
    const btn = this.add.rectangle(x, y, w, h, color).setInteractive({ useHandCursor: true });
    const text = this.add.text(x, y, label, {
      fontFamily: FONT, fontSize, color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    btn.on('pointerover', () => btn.setAlpha(0.85));
    btn.on('pointerout', () => btn.setAlpha(1));
    btn.on('pointerdown', onClick);
    parent.add([btn, text]);
  }

  private toastY = 510;
  private toast(msg: string, good: boolean) {
    // 연속 토스트가 겹치지 않게 살짝 어긋나게 표시
    this.toastY = this.toastY === 510 ? 478 : 510;
    const t = this.add.text(480, this.toastY, msg, {
      fontFamily: FONT, fontSize: '16px', color: good ? '#7bd88f' : '#ff8b8b',
      backgroundColor: '#0d1420', padding: { x: 14, y: 8 },
    }).setOrigin(0.5).setDepth(90);
    this.tweens.add({
      targets: t, alpha: 0, delay: 1600, duration: 500,
      onComplete: () => t.destroy(),
    });
  }
}
