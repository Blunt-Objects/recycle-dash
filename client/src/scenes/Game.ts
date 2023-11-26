import Phaser from "phaser";
import { Client, Room } from "colyseus.js";
import { Body } from "matter";
//types

type Player = {
  x: number;
  y: number;
  animation: string | null;
  inputQueue: any;
  onChange: any; //MUST fix this cannot put an any type in front of Johnny and Haz;
  holdingItem: boolean;
};
type TrashCan = {
  x: number;
  y: number;
  imgUrl: string;
  type: string;
};

type Trash = {
  x: number;
  y: number;
  imgUrl: string;
  type: string;
  points: number;
  pickedUp: boolean;
  name: string;
};

type InputPayloadType = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  animation: string | null | Body;
};
type PlayerWithPhysics = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
  playerNumber?: number;
} & { holding?: boolean };
export default class Game extends Phaser.Scene {
  state: any;
  constructor() {
    super("game");
  }
  // properties
  currentPlayer!: PlayerWithPhysics;
  remoteRef!: Phaser.GameObjects.Rectangle;

  inputPayload: InputPayloadType = {
    left: false,
    right: false,
    up: false,
    down: false,
    animation: "down-idle-0",
  };
  client = new Client("ws://localhost:2567");

  playerEntities: { [sessionId: string]: any } = {};
  trashCanEntities: { [key: string]: any } = {};
  trashEntities: { [key: string]: any } = {};
  cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;

  canBeCarried: boolean = false;
  activeTrash!: Trash | null;

  preload() {
    this.load.image("gameBackground", "https://i.ibb.co/khH5sZ0/map.png");
  }
  room!: Room;

  init() {
    this.cursorKeys = this.input.keyboard!.createCursorKeys();
  }
  //methods
  private createCan(trashCanItem: any, key: string) {
    const rectWidth = 32;
    const rectHeight = 32;

    const graphics = this.add.graphics({ fillStyle: { alpha: 0 } });
    const rect = new Phaser.Geom.Rectangle(
      trashCanItem.x,
      trashCanItem.y,
      rectWidth,
      rectHeight
    );
    graphics.fillRectShape(rect);

    const imageX = trashCanItem.x + rectWidth / 2;
    const imageY = trashCanItem.y + rectHeight / 2;

    const image = this.physics.add.image(imageX, imageY, trashCanItem.type);
    image.setInteractive();
    Object.values(this.playerEntities).forEach((player: PlayerWithPhysics) => {
      this.physics.add.collider(
        player,
        image,
        this.handleTrashCanCollision,
        undefined,
        this
      );
    });
    this.trashCanEntities[key] = graphics;
  }
  private createTrash(trashItem: any, key: string) {
    console.log(trashItem);

    const rectWidth = 32;
    const rectHeight = 32;

    const graphics = this.add.graphics({ fillStyle: { alpha: 0 } });
    const rect = new Phaser.Geom.Rectangle(
      trashItem.x,
      trashItem.y,
      rectWidth,
      rectHeight
    );
    graphics.fillRectShape(rect);

    const imageX = trashItem.x + rectWidth / 2;
    const imageY = trashItem.y + rectHeight / 2;

    const image = this.physics.add.image(imageX, imageY, trashItem.name);
    image.setInteractive(); // if needed
    Object.values(this.playerEntities).forEach((player: PlayerWithPhysics) => {
      this.physics.add.collider(
        player,
        image,
        this.handleTrashCollision,
        undefined,
        this
      );
    });
    this.trashEntities[trashItem.name] = image;
  }

  private handleTrashCollision(player, trash) {
    // in here will need to set something on trash to be true to complete a check in the update controllers to allow user to grab that item

    console.log("collide");
    if (this.activeTrash) {
      return;
    }
    this.activeTrash = trash;
    // console.log(trash);
  }

  private handleTrashCanCollision(player, trashCan) {
    console.log("found a bin");
    if (this.currentPlayer.holding) {
      console.log(this.activeTrash);
      this.activeTrash.destroy();
      this.activeTrash = null;
      this.currentPlayer.holding = false;
    }
  }
  updateActiveTrash() {
    if (!this.activeTrash) {
      return;
    }
    const distance = Phaser.Math.Distance.Between(
      this.currentPlayer.x,
      this.currentPlayer.y,
      this.activeTrash.x,
      this.activeTrash.y
    );

    if (distance < 64) {
      return;
    }
    this.activeTrash = null;
  }

  async create() {
    const bg = this.add.sprite(0, 0, "gameBackground");
    bg.setOrigin(0, 0);
    console.log("Joining Room");
    try {
      this.room = await this.client.joinOrCreate("my_room");

      this.room.state.trashCans.onAdd((trashCan: TrashCan, key: string) => {
        this.createCan(trashCan, key);
      });
      this.room.state.trash.onAdd((trashItem: Trash, key: string) => {
        this.createTrash(trashItem, key);
      });

      this.room.state.players.onAdd(
        (player: Player, sessionId: string | number) => {
          console.log(
            "A player has joined! Their unique session id is",
            sessionId
          );
          console.log(
            "Players connected: ",
            Object.keys(this.playerEntities).length + 1
          );

          const playerNum = Object.keys(this.playerEntities).length;
          const sprites = [24, 36, 48, 60];

          const entity = this.physics.add.sprite(
            player.x,
            player.y,
            "playerSheet",
            sprites[playerNum]
          );

          entity.setScale(0.55);
          this.playerEntities[sessionId] = entity;
          this.playerEntities[sessionId].holdingItem = false;
          this.playerEntities[sessionId].playerNumber = playerNum;
          if (sessionId === this.room.sessionId) {
            this.currentPlayer = entity;
          } else {
            // all remote players are here!

            player.onChange(() => {
              entity.setData("serverX", player.x);
              entity.setData("serverY", player.y);
            });
          }

          player.onChange(() => {
            entity.setData("serverX", player.x);
            entity.setData("serverY", player.y);
            entity.setData("animation", player.animation);
          });
        }
      );

      this.room.state.players.onRemove((sessionId: string | number) => {
        const entity = this.playerEntities[sessionId];
        if (entity) {
          entity.destroy();
          delete this.playerEntities[sessionId];
        }
        console.log(`Player at session ${sessionId} has left the game`);
      });
    } catch (e) {
      console.error(e);
    }
  }

  update(time: number, delta: number): void {
    if (!this.currentPlayer) {
      return;
    }
    if (!this.room) {
      return;
    }
    this.updateActiveTrash();

    const animNum: number = this.currentPlayer.playerNumber || 0;

    const velocity = 2;

    this.inputPayload.left = this.cursorKeys.left.isDown;
    this.inputPayload.right = this.cursorKeys.right.isDown;
    this.inputPayload.up = this.cursorKeys.up.isDown;
    this.inputPayload.down = this.cursorKeys.down.isDown;

    this.inputPayload.animation =
      this.currentPlayer.anims.currentAnim?.key || null;

    if (this.inputPayload.left) {
      this.currentPlayer.play(`left-walk-${animNum}`, true);
      this.currentPlayer.x -= velocity;
      this.activeTrash?.pickedUp ? (this.activeTrash.x -= velocity) : null;
    } else if (this.inputPayload.right) {
      this.currentPlayer.play(`right-walk-${animNum}`, true);
      this.currentPlayer.x += velocity;
      this.activeTrash?.pickedUp ? (this.activeTrash.x += velocity) : null;
    }

    if (this.inputPayload.up) {
      this.currentPlayer.play(`up-walk-${animNum}`, true);
      this.currentPlayer.y -= velocity;
      this.activeTrash?.pickedUp ? (this.activeTrash.y -= velocity) : null;
    } else if (this.inputPayload.down) {
      this.currentPlayer.play(`down-walk-${animNum}`, true);
      this.currentPlayer.y += velocity;
      this.activeTrash?.pickedUp ? (this.activeTrash.y += velocity) : null;
    } else {
      this.currentPlayer.setVelocity(0, 0);

      if (!this.inputPayload.left && !this.inputPayload.right) {
        const currentAnimKey = this.currentPlayer.anims.currentAnim?.key;

        // Check if the player is not already playing an idle animation
        if (currentAnimKey && !currentAnimKey.includes("idle")) {
          const parts = currentAnimKey.split("-");
          const direction = parts[0];
          this.currentPlayer.play(`${direction}-idle-${animNum}`);
        }
      }
    }
    const spaceJustPressed = Phaser.Input.Keyboard.JustUp(
      this.cursorKeys.space
    );

    if (spaceJustPressed && this.activeTrash) {
      this.activeTrash.pickedUp = true;
      this.currentPlayer.holding = true;
      console.log(this.activeTrash.pickedUp);
      console.log("x pos : ", this.activeTrash.x);
      console.log("y pos : ", this.activeTrash.y);
      this.activeTrash.x = this.currentPlayer.x;
      this.activeTrash.y = this.currentPlayer.y;
      console.log("gotcha");
    }

    this.room.send("updatePlayer", this.inputPayload);

    for (let sessionId in this.playerEntities) {
      if (sessionId === this.room.sessionId) {
        continue;
      }

      const entity = this.playerEntities[sessionId];

      if (entity) {
        const { serverX, serverY, animation } = entity.data.values;
        entity.x = Phaser.Math.Linear(entity.x, serverX, 0.4);
        entity.y = Phaser.Math.Linear(entity.y, serverY, 0.4);
        if (animation) {
          entity.play(animation, true);
        }
      }
    }
  }
  private setupCollision(object1: any, object2: any, callback: any) {
    this.physics.add.collider(object1, object2, callback);
  }
}
