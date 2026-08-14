import Phaser from 'phaser';

// public/assets/ 의 에셋 키/경로 매핑 (WSL fal.ai 파이프라인 생성물)
export const ASSETS: Record<string, string> = {
  bg_title: 'assets/bg_title.png',
  bg_game: 'assets/bg_game.png',
  char_hero: 'assets/char_hero.png',
  char_doctor: 'assets/char_doctor.png',
  char_visitor: 'assets/char_visitor.png',
};

// 어느 씬에서 시작해도 동작하도록, 없는 텍스처만 큐에 추가
export function queueAssets(scene: Phaser.Scene) {
  for (const [key, path] of Object.entries(ASSETS)) {
    if (!scene.textures.exists(key)) scene.load.image(key, path);
  }
  if (!scene.cache.audio.exists('bgm')) scene.load.audio('bgm', 'assets/bgm.mp3');
}

// BGM 재생 (이미 재생 중이면 무시). 사용자 입력 후 호출해야 자동재생 정책에 안 걸림
export function playBgm(scene: Phaser.Scene, mutedNow: boolean) {
  if (!scene.cache.audio.exists('bgm')) return;
  let music = scene.sound.get('bgm');
  if (!music) {
    music = scene.sound.add('bgm', { loop: true, volume: 0.2 });
  }
  scene.sound.mute = mutedNow;
  if (!music.isPlaying) music.play();
}

export function hasAsset(scene: Phaser.Scene, key: string): boolean {
  return scene.textures.exists(key);
}
