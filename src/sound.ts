// WebAudio 합성 효과음 — 외부 파일 없이 코드로 생성 (라이선스/용량 부담 0)
// BGM(mp3)은 Phaser 사운드로 재생하고, 음소거 상태만 여기서 공유

const MUTE_KEY = 'khima_muted';
let ctx: AudioContext | null = null;
let muted = typeof localStorage !== 'undefined' && localStorage.getItem(MUTE_KEY) === '1';

function ac(): AudioContext | null {
  if (muted) return null;
  if (!ctx) {
    try {
      ctx = new AudioContext();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function isMuted(): boolean {
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  localStorage.setItem(MUTE_KEY, value ? '1' : '0');
}

interface ToneOpts {
  type?: OscillatorType;
  vol?: number;
  delay?: number; // 시작 지연(초)
  slideTo?: number; // 종료 주파수 (글라이드)
}

function tone(freq: number, dur: number, opts: ToneOpts = {}) {
  const c = ac();
  if (!c) return;
  const { type = 'square', vol = 0.12, delay = 0, slideTo } = opts;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function noise(dur: number, vol = 0.08, delay = 0) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const filter = c.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.value = 3000;
  filter.Q.value = 0.8;
  const gain = c.createGain();
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(gain).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  /** 버튼 클릭 */
  click() {
    tone(660, 0.06, { vol: 0.07 });
  },
  /** 차트 선택 (종이 넘기는 소리) */
  paper() {
    noise(0.09, 0.06);
  },
  /** 올바른 처리 */
  success() {
    tone(880, 0.09, { type: 'sine', vol: 0.14 });
    tone(1318, 0.14, { type: 'sine', vol: 0.14, delay: 0.09 });
  },
  /** 돈 획득 (상점 구매) */
  coin() {
    tone(988, 0.07, { vol: 0.1 });
    tone(1319, 0.18, { vol: 0.1, delay: 0.07 });
  },
  /** 실수/페널티 */
  error() {
    tone(220, 0.28, { type: 'sawtooth', vol: 0.12, slideTo: 110 });
  },
  /** 감염병 경보 */
  alarm() {
    tone(660, 0.12, { type: 'triangle', vol: 0.13 });
    tone(880, 0.12, { type: 'triangle', vol: 0.13, delay: 0.15 });
    tone(660, 0.12, { type: 'triangle', vol: 0.13, delay: 0.3 });
  },
  /** 민원인 도착 (딩동) */
  doorbell() {
    tone(784, 0.18, { type: 'sine', vol: 0.13 });
    tone(659, 0.3, { type: 'sine', vol: 0.13, delay: 0.18 });
  },
  /** 등급업/인증평가 통과 팡파레 */
  fanfare() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => tone(f, i === notes.length - 1 ? 0.35 : 0.12, {
      type: 'square', vol: 0.11, delay: i * 0.11,
    }));
  },
  /** 실패/슬픔 */
  sad() {
    tone(392, 0.16, { type: 'sine', vol: 0.11 });
    tone(330, 0.3, { type: 'sine', vol: 0.11, delay: 0.16 });
  },
  /** 하루 결산 차임 */
  chime() {
    tone(1047, 0.12, { type: 'sine', vol: 0.09 });
    tone(1319, 0.25, { type: 'sine', vol: 0.09, delay: 0.1 });
  },
};
