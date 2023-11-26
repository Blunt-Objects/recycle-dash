import Phaser from "phaser";
import { Client, Room } from "colyseus.js";

type Player = {
  x: number;
  y: number;
  animation: string | null;
  holding: boolean;
  holdingType: string;
  inputQueue: any;
  onChange: any; //MUST fix this cannot put an any type in front of Johnny and Haz
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
  trashType: string;
  points: number;
  pickedUp: boolean;
  name: string;
};

type TrashInputPayLoadType = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  trashItem: Trash | null;
};

type InputPayloadType = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  animation: string | null;
};
type PlayerWithPhysics = Phaser.Types.Physics.Arcade.SpriteWithDynamicBody & {
  playerNumber?: number;
} & { holding?: boolean };

type Difficulty = "EASY" | "MEDIUM" | "HARD" | null;
export default class Game extends Phaser.Scene {
  state: any;
  difficulty: Difficulty;
  timer!: Phaser.GameObjects.Text | null;
  timerValue: string;
  constructor() {
    super("game");
    this.difficulty = null;
    this.timerValue = "0";
  }

  currentPlayer!: PlayerWithPhysics;
  remoteRef!: Phaser.GameObjects.Rectangle;
  cursorKeys!: Phaser.Types.Input.Keyboard.CursorKeys;

  countdown: any;
  canBeCarried: boolean = false;
  activeTrash!:
    | (Trash & { [key: string]: (num?: number) => void } & {
        data: { list: { [key: string]: string } };
      })
    | null;
  preload() {
    this.load.image(
      "gameBackground",
      "https://i.ibb.co/5xHfZX3/recyleroom.png"
    );
  }

  init({ difficulty }: { difficulty: Difficulty }) {
    this.cursorKeys = this.input.keyboard!.createCursorKeys();
    if (difficulty) {
      this.difficulty = difficulty;
    }
  }
  client = new Client("ws://localhost:2567");

  playerEntities: { [sessionId: string]: any } = {};
  trashCanEntities: { [key: string]: any } = {};
  trashEntities: { [key: string]: any } = {};
  wallEntities: any[] = [];

  private handleClock = (value: number) => {
    this.timerValue = value.toString();
    if (this.timer) {
      this.timer.setText(value.toString());
    }
  };

  endTheGame(numOfPlayers: number) {
    let currentTimerValue = [];
    currentTimerValue.push(this.timerValue);

    let dataToPass = {
      timer: currentTimerValue[0],
      numOfPlayers: numOfPlayers,
    };
    this.game.scene.start("endgame", dataToPass);
  }

  room!: Room;
  async create(data: { difficulty: string }) {
    const bg = this.add.sprite(0, 0, "gameBackground");
    bg.setOrigin(0, 0);
    try {
      this.room = await this.client.joinOrCreate("my_room");
      this.room.send("setDifficulty", this.difficulty);
      this.room.onMessage("clock", this.handleClock);
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
          const sprites = [25, 37, 49, 61];

          const entity = this.physics.add.sprite(
            player.x,
            player.y,
            "playerSheet",
            sprites[playerNum]
          );
          entity.setCollideWorldBounds(true);
          entity.setScale(0.55);
          this.wallEntities.forEach(wall => {
            this.physics.add.collider(entity, wall, (player, wall) => {});
          });
          this.playerEntities[sessionId] = entity;
          this.playerEntities[sessionId].playerNumber = playerNum;
          if (sessionId === this.room.sessionId) {
            this.currentPlayer = entity;
          } else {
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
      this.room.onMessage(
        "updateTrashPosition",
        ({ trashId, trashX, trashY }) => {
          this.updateTrashPosition(trashId, trashX, trashY);
        }
      );
      this.room.onMessage("removeTrash", (id: string) => {
        for (const key in this.trashEntities) {
          const item = this.trashEntities[key];
          if (item.uniqueId === id) {
            delete this.trashEntities[key];
          }
        }
      });
      // PADDOCKS
      this.makeWall(90, 750, 25, 100);
      this.makeWall(200, 750, 25, 100);
      this.makeWall(280, 750, 25, 100);
      this.makeWall(390, 750, 25, 100);
      this.makeWall(470, 750, 25, 100);
      this.makeWall(590, 750, 25, 100);
      this.makeWall(660, 750, 25, 100);
      this.makeWall(780, 750, 25, 100);

      //MIDDLE BIT
      this.makeWall(155, 425, 8, 70);
      this.makeWall(155, 280, 8, 70);
      this.makeWall(705, 425, 8, 70);
      this.makeWall(705, 280, 8, 70);

      this.makeWall(190, 455, 75, 8);
      this.makeWall(335, 455, 90, 8);
      this.makeWall(530, 455, 90, 8);
      this.makeWall(675, 455, 70, 8);

      this.makeWall(190, 250, 75, 8);
      this.makeWall(335, 250, 90, 8);
      this.makeWall(530, 250, 90, 8);
      this.makeWall(675, 250, 70, 8);

      //box room
      this.makeWall(835, 405, 8, 60);
      this.makeWall(835, 290, 8, 60);
      this.makeWall(930, 260, 170, 8);
      this.makeWall(920, 465, 170, 50);

      //clock
      this.makeWall(920, 750, 170, 100);

      //converyor belts
      this.makeWall(910, 20, 90, 80);
      this.makeWall(620, 20, 90, 80);
      this.makeWall(390, 20, 90, 80);
      this.makeWall(110, 20, 90, 80);

      // PADDOCKS
      this.makeWall(90, 750, 25, 100);
      this.makeWall(200, 750, 25, 100);
      this.makeWall(280, 750, 25, 100);
      this.makeWall(390, 750, 25, 100);
      this.makeWall(470, 750, 25, 100);
      this.makeWall(590, 750, 25, 100);
      this.makeWall(660, 750, 25, 100);
      this.makeWall(780, 750, 25, 100);

      //MIDDLE BIT
      this.makeWall(155, 425, 8, 70);
      this.makeWall(155, 280, 8, 70);
      this.makeWall(705, 425, 8, 70);
      this.makeWall(705, 280, 8, 70);

      this.makeWall(190, 455, 75, 8);
      this.makeWall(335, 455, 90, 8);
      this.makeWall(530, 455, 90, 8);
      this.makeWall(675, 455, 70, 8);

      this.makeWall(190, 250, 75, 8);
      this.makeWall(335, 250, 90, 8);
      this.makeWall(530, 250, 90, 8);
      this.makeWall(675, 250, 70, 8);

      //box room
      this.makeWall(835, 405, 8, 60);
      this.makeWall(835, 290, 8, 60);
      this.makeWall(930, 260, 170, 8);
      this.makeWall(920, 465, 170, 50);

      //clock
      this.makeWall(920, 750, 170, 100);

      //converyor belts
      this.makeWall(910, 20, 90, 80);
      this.makeWall(620, 20, 90, 80);
      this.makeWall(390, 20, 90, 80);
      this.makeWall(110, 20, 90, 80);

      this.timer = this.add
        .text(900, 760, this.timerValue, {
          fontFamily: "MarioKart",
          backgroundColor: "#e3d081",
          color: "#b33951",
          fontSize: "30px",
          fixedWidth: 150,
          padding: { x: 20, y: 10 },
          align: "center",
        })
        .setOrigin(0.5);

      this.add
        .text(900, 730, "Time Taken", {
          fontFamily: "MarioKart",
          backgroundColor: "#e3d081",
          color: "#b33951",
          fontSize: "15px",
          padding: { x: 20, y: 5 },
          align: "center",
        })
        .setOrigin(0.5);

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

    if (this.room.state.trash.length === 0) {
      if (this.room.state.gameInProgress === "LOBBY") return;
      this.endTheGame(Object.keys(this.playerEntities).length);
    }
    this.updateActiveTrash();
    if (!this.currentPlayer) {
      return;
    }
    if (!this.room) {
      return;
    }

    if (this.room.state.trash.length === 1) {
      this.endTheGame(Object.keys(this.playerEntities).length);
    }

    const animNum: number = this.currentPlayer.playerNumber || 0;
    const velocity = 200; // Adjust this value based on desired speed

    // Reset velocities to 0 initially
    this.currentPlayer.setVelocity(0);

    // Determine animation and movement direction
    if (this.cursorKeys.left.isDown) {
      this.currentPlayer.setVelocityX(-velocity);
      this.currentPlayer.play(`left-walk-${animNum}`, true);
    } else if (this.cursorKeys.right.isDown) {
      this.currentPlayer.setVelocityX(velocity);
      this.currentPlayer.play(`right-walk-${animNum}`, true);
    }

    if (this.cursorKeys.up.isDown) {
      this.currentPlayer.setVelocityY(-velocity);
      this.currentPlayer.play(`up-walk-${animNum}`, true);
    } else if (this.cursorKeys.down.isDown) {
      this.currentPlayer.setVelocityY(velocity);
      this.currentPlayer.play(`down-walk-${animNum}`, true);
    }

    // If the player is not moving, play idle animation
    if (
      !this.cursorKeys.left.isDown &&
      !this.cursorKeys.right.isDown &&
      !this.cursorKeys.up.isDown &&
      !this.cursorKeys.down.isDown
    ) {
      const currentAnimKey = this.currentPlayer.anims.currentAnim?.key;
      if (currentAnimKey && !currentAnimKey.includes("idle")) {
        const parts = currentAnimKey.split("-");
        const direction = parts[0];
        this.currentPlayer.play(`${direction}-idle-${animNum}`);
      }
    }

    // Send updated player state to the server
    this.room.send("updatePlayer", {
      x: this.currentPlayer.x,
      y: this.currentPlayer.y,
      animation: this.currentPlayer.anims.currentAnim?.key,
    });

    // Update other players based on server data
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

    const spaceJustPressed = Phaser.Input.Keyboard.JustUp(
      this.cursorKeys.space
    );

    if (spaceJustPressed && this.activeTrash) {
      this.activeTrash.setScale(0.5);
      this.activeTrash.pickedUp = true;
      this.currentPlayer.holding = true;
    }

    if (this.activeTrash?.pickedUp) {
      this.activeTrash.x = this.currentPlayer.x;
      this.activeTrash.y = this.currentPlayer.y;
    }
    this.room.send("updateTrash", {
      trashId: this.activeTrash?.data.list.id,
      trashX: this.activeTrash?.x,
      trashY: this.activeTrash?.y,
    });

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
    Object.values(this.playerEntities).forEach((player: PlayerWithPhysics) => {
      this.physics.add.overlap(
        player,
        image,
        this.handleTrashCanCollision,
        undefined,
        this
      );
    });
    this.trashCanEntities[key] = graphics;
  }
  private updateTrashPosition(trashId: string, newX: number, newY: number) {
    // Find the trash object. This depends on how you're storing them.
    const trash = Object.values(this.trashEntities).find(
      (t: any) => t.uniqueId === trashId
    );

    if (trash) {
      trash.x = newX;
      trash.y = newY;
    }
  }
  private createTrash(trashItem: any, key: string) {
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
    image.setBounce(0, 0);
    Object.values(this.playerEntities).forEach((player: PlayerWithPhysics) => {
      this.physics.add.overlap(player, image, this.handleTrashCollision);

      trashItem.onRemove(() => {
        image.destroy();
      });
    });

    image.setInteractive();
    Object.values(this.playerEntities).forEach((player: PlayerWithPhysics) => {
      this.physics.add.overlap(
        player,
        image,
        this.handleTrashCollision,
        undefined,
        this
      );
    });
    image.setData("id", trashItem.uniqueId);
    console.log(trashItem.uniqueId, "id");
    trashItem.onChange(() => {
      image.x = trashItem.x;
      image.y = trashItem.y;
    });
    this.trashEntities[trashItem.name] = image;
  }

  private handleTrashCollision(player: any, trash: any) {
    if (this.activeTrash) {
      return;
    }
    this.activeTrash = trash;
    player.holdingType = trash.texture.key;
  }
  private makeWall = (x: number, y: number, width: number, height: number) => {
    const wall = this.add.rectangle(x, y, width, height, 0xffffff, 0);
    this.physics.add.existing(wall, true);
    Object.values(this.playerEntities).forEach(player => {
      this.physics.add.collider(player, wall, this.handleCollision);
    });
    this.wallEntities.push(wall);
  };

  private handleTrashCanCollision(player: any, trashCan: any) {
    console.log("found a bin");
    const correctBin: {
      [key: string]: string;
    } = {
      "beer-bottle": "glass",
      "cardboard-box": "paper",
      "ceramic-mug": "non-recyclable",
      "detergent-bottle": "plastic",
      "glass-bottle": "glass",
      "glass-jar": "glass",
      "milk-bottle": "plastic",
      newspaper: "paper",
      "paper-bag": "paper",
      "polystyrene-cup": "non-recyclable",
      "spray-paint": "non-recyclable",
      "water-bottle": "plastic",
    };
    if (this.currentPlayer.holding) {
      const bin = trashCan.texture.key;
      const holding: string = player.holdingType;
      console.log(correctBin[holding], bin);
      if (correctBin[holding] === bin) {
        console.log("Yay! Correct bin!!");
        this.room.send("deleteTrash", this.activeTrash?.data.list.id);
        this.activeTrash && this.activeTrash.destroy();
        this.activeTrash = null;
        this.currentPlayer.holding = false;
      } else {
        console.log(`Oh No! You put ${holding} in a ${bin} bin!`);
      }
    }
  }
  private updateActiveTrash() {
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

  private handleCollision(player: any, wall: any) {
    if (player.body.touching.up) {
      console.log("Collided on the top side of the player");
    } else if (player.body.touching.down) {
      console.log("Collided on the bottom side of the player");
    }

    if (player.body.touching.left) {
      console.log("Collided on the left side of the player");
    } else if (player.body.touching.right) {
      console.log("Collided on the right side of the player");
    }
  }
}
