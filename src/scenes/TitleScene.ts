import Phaser from 'phaser';
import { hasAsset, queueAssets } from '../assetLoader';
import { sfx } from '../sound';

export class TitleScene extends Phaser.Scene {
  constructor() {
    super('Title');
  }

  preload() {
    queueAssets(this);
  }

  create() {
    const { width: W, height: H } = this.scale;

    if (hasAsset(this, 'bg_title')) {
      this.add.image(W / 2, H / 2, 'bg_title').setDisplaySize(W, H);
      this.add.rectangle(W / 2, H / 2, W, H, 0x10161f, 0.45);
    }

    // 캐릭터 폴라로이드 카드 (에셋 있을 때만)
    if (hasAsset(this, 'char_hero')) {
      const card = this.add.container(W * 0.82, H * 0.52);
      card.add(this.add.rectangle(0, 0, 236, 236, 0xffffff));
      card.add(this.add.image(0, -8, 'char_hero').setDisplaySize(216, 216));
      card.add(this.add.text(0, 106, '보건의료정보관리사', {
        fontFamily: 'sans-serif', fontSize: '14px', color: '#333333', fontStyle: 'bold',
      }).setOrigin(0.5));
      card.setRotation(Phaser.Math.DegToRad(4));
    }
    if (hasAsset(this, 'char_doctor')) {
      const card = this.add.container(W * 0.15, H * 0.55);
      card.add(this.add.rectangle(0, 0, 180, 180, 0xffffff));
      card.add(this.add.image(0, -7, 'char_doctor').setDisplaySize(162, 162));
      card.add(this.add.text(0, 80, '서명을 깜빡한 의사', {
        fontFamily: 'sans-serif', fontSize: '12px', color: '#333333',
      }).setOrigin(0.5));
      card.setRotation(Phaser.Math.DegToRad(-5));
    }

    this.add.text(W / 2, H * 0.24, '메디컬 레코드 타이쿤', {
      fontFamily: 'sans-serif', fontSize: '48px', color: '#ffffff', fontStyle: 'bold',
      stroke: '#10161f', strokeThickness: 8,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.38, '신입 보건의료정보관리사가 되어 병원 기록실을 운영하세요!', {
      fontFamily: 'sans-serif', fontSize: '20px', color: '#d8e8f8',
      stroke: '#10161f', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.55,
      '· 미비기록 차트는 의사에게 반송\n· 완성된 차트는 올바른 질병코드로 코딩\n· 잘못 처리하면 삭감·평판 하락!', {
      fontFamily: 'sans-serif', fontSize: '17px', color: '#c8d8e8', align: 'center', lineSpacing: 8,
      stroke: '#10161f', strokeThickness: 4,
    }).setOrigin(0.5);

    const btn = this.add.rectangle(W / 2, H * 0.78, 240, 64, 0x2e86de)
      .setInteractive({ useHandCursor: true });
    this.add.text(W / 2, H * 0.78, '출근하기', {
      fontFamily: 'sans-serif', fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);

    btn.on('pointerover', () => btn.setFillStyle(0x4aa3f0));
    btn.on('pointerout', () => btn.setFillStyle(0x2e86de));
    btn.on('pointerdown', () => {
      sfx.click();
      this.scene.start('Game');
    });

    const link = this.add.text(W / 2, H * 0.93, '🔗 보건의료정보관리사가 궁금하다면? (협회 홈페이지)', {
      fontFamily: 'sans-serif', fontSize: '14px', color: '#9fb8d0',
      stroke: '#10161f', strokeThickness: 3,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    link.on('pointerover', () => link.setColor('#d8e8f8'));
    link.on('pointerout', () => link.setColor('#9fb8d0'));
    link.on('pointerdown', () => window.open('https://khima.or.kr', '_blank'));
  }
}
