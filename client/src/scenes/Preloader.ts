import Phaser from 'phaser';

export default class PreLoader extends Phaser.Scene {
  constructor() {
    super('preloader');
  }

  preload() {
    this.load.spritesheet(
      'playerSheet',
      'https://i.ibb.co/rbjPCCj/Characters-V3-Colour-3.png',
      { frameWidth: 80, frameHeight: 80 }
    );
  }
  create() {
    const startPositions = {
      downIdle: 156,
      upIdle: 157,
      leftIdle: 159,
      rightIdle: 158,
      downWalkStart: 160,
      downWalkEnd: 161,
      upWalkStart: 162,
      upWalkEnd: 163,
      leftWalkStart: 166,
      leftWalkEnd: 167,
      rightWalkStart: 164,
      rightWalkEnd: 165,
    };
    for (let i = 0; i < 4; i++) {
      this.anims.create({
        key: `down-idle-${i}`,
        frames: [{ key: `playerSheet`, frame: startPositions.downIdle }],
      });
      this.anims.create({
        key: `up-idle-${i}`,
        frames: [{ key: `playerSheet`, frame: startPositions.upIdle }],
      });

      this.anims.create({
        key: `left-idle-${i}`,
        frames: [{ key: `playerSheet`, frame: startPositions.leftIdle }],
      });

      this.anims.create({
        key: `right-idle-${i}`,
        frames: [{ key: `playerSheet`, frame: startPositions.rightIdle }],
      });

      this.anims.create({
        key: `down-walk-${i}`,
        frames: this.anims.generateFrameNumbers(`playerSheet`, {
          start: startPositions.downWalkStart,
          end: startPositions.downWalkEnd,
        }),
        frameRate: 8,
        repeat: -1,
      });

      this.anims.create({
        key: `up-walk-${i}`,
        frames: this.anims.generateFrameNumbers(`playerSheet`, {
          start: startPositions.upWalkStart,
          end: startPositions.upWalkEnd,
        }),
        frameRate: 8,
        repeat: -1,
      });

      this.anims.create({
        key: `left-walk-${i}`,
        frames: this.anims.generateFrameNumbers(`playerSheet`, {
          start: startPositions.leftWalkStart,
          end: startPositions.leftWalkEnd,
        }),
        frameRate: 8,
        repeat: -1,
      });

 

      this.anims.create({
        key: `right-walk-${i}`,
        frames: this.anims.generateFrameNumbers(`playerSheet`, {
          start: startPositions.rightWalkStart,
          end: startPositions.rightWalkEnd,
        }),
        frameRate: 8,
        repeat: -1,
      });

      startPositions.downIdle += 12;
      startPositions.upIdle += 12;
      startPositions.leftIdle += 12;
      startPositions.rightIdle += 12;

      startPositions.downWalkStart += 12;
      startPositions.downWalkEnd += 12;
      startPositions.upWalkStart += 12;
      startPositions.upWalkEnd += 12;
      startPositions.leftWalkStart += 12;
      startPositions.leftWalkEnd += 12;
      startPositions.rightWalkStart += 12;
      startPositions.rightWalkEnd += 12;
    }

    this.scene.start('welcome');

  }
}
