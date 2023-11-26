import { Room, Client } from "@colyseus/core";
import { MyRoomState, Player } from "./schema/MyRoomState";
import {
  GlassCan,
  NonRecyclable,
  PaperCan,
  PlasticCan,
} from "../Trash/TrashCans";
import {
  HEIGHT,
  PLAYER_SPAWN_LOCATIONS,
  TRASH_FOR_DIFFICULTY,
  WIDTH,
} from "../globalConstants";
import TrashGenerator from "../Trash/TrashGenorator";

const LETTERS = "ABCDEFGHIJKLLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
type GameState = "LOBBY" | "EASY" | "MEDIUM" | "HARD" | "COMPLETE";
type PlayerIndex = keyof typeof PLAYER_SPAWN_LOCATIONS;
export class MyRoom extends Room<MyRoomState> {
  maxClients = 4;
  update: any;
  LOBBY_CHANNEL = "$mylobby";
  set gameState(gameInProgress: GameState) {
    this.state.gameInProgress = gameInProgress;
  }
  get gameState() {
    return this.state.gameInProgress as GameState;
  }
  generateRoomIdSingle(): string {
    let result = "";
    for (let i = 0; i < 4; i++) {
      result += LETTERS.charAt(Math.floor(Math.random() * LETTERS.length));
    }
    return result;
  }

  async generateRoomId(): Promise<string> {
    const currentIds = await this.presence.smembers(this.LOBBY_CHANNEL);
    let id;
    do {
      id = this.generateRoomIdSingle();
    } while (currentIds.includes(id));

    await this.presence.sadd(this.LOBBY_CHANNEL, id);
    return id;
  }
  private clockInterval: any;
  async onCreate(options: any) {
    this.roomId = await this.generateRoomId();
    this.setState(new MyRoomState());
    this.setUpCans();
    this.setUpTrash();
    this.clockInterval = setInterval(() => {
      this.incrementClock();
    }, 1000);
    this.onMessage("updatePlayer", (client, input) => {
      const player = this.state.players.get(client.sessionId);
      console.log(player, "PLAYER");
      if (!player || !input?.x || !input?.y) return;
      player.x = input.x;
      player.y = input.y;
      player.animation = input.animation;
    });
    this.onMessage("updateTrash", (client, input) => {
      const { trashId, trashX, trashY } = input;

      const item = this.state.trash.find(trash => {
        return trash.uniqueId === trashId;
      });

      if (item) {
        item.x = trashX;
        item.y = trashY;
      }
      this.broadcast("updateTrashPosition", { trashId, trashX, trashY });
    });

    this.onMessage("deleteTrash", (client, input) => {
      const indexToRemove = this.state.trash.findIndex((item: any) => {
        return item.uniqueId === input;
      });
      console.log(input, indexToRemove);

      if (indexToRemove !== -1) {
        this.state.trash.splice(indexToRemove, 1);
      }
      this.broadcast("removeTrash", input);
    });

    this.onMessage("setDifficulty", (client, difficulty) => {
      if (this.gameState !== "LOBBY") return;
      this.gameState = difficulty as GameState;
      this.setUpTrash();
    });
    1;
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, "joined!");
    const mapWidth = WIDTH;
    const mapHeight = HEIGHT;
    const playerNumber = (this.state.players.size + 1) as PlayerIndex;
    const spawn = PLAYER_SPAWN_LOCATIONS[playerNumber];
    const player = new Player();
    player.x = spawn.x;
    player.y = spawn.y;
    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    clearInterval(this.clockInterval);
    console.log("room", this.roomId, "disposing...");
  }

  private setUpCans() {
    const locations: { x: number; y: number }[] = [];
    for (let i = 4; i > 0; i--) {
      const x = (i * WIDTH) / 5;
      const y = (HEIGHT * 3) / 5;
      locations.push({ x, y });
    }
    locations.sort(() => Math.random() - 0.5);
    this.state.trashCans.set("0", new PaperCan(locations[0].x, locations[0].y));
    this.state.trashCans.set(
      "1",
      new PlasticCan(locations[1].x, locations[1].y)
    );
    this.state.trashCans.set("2", new GlassCan(locations[2].x, locations[2].y));
    this.state.trashCans.set(
      "3",
      new NonRecyclable(locations[3].x, locations[3].y)
    );
  }
  private setUpTrash() {
    const difficulties = ["EASY", "MEDIUM", "HARD"];
    if (!difficulties.includes(this.gameState)) return;
    this.state.trash.clear();
    const key = this.gameState as keyof typeof TRASH_FOR_DIFFICULTY;
    const numberOfTrashToSpawn = TRASH_FOR_DIFFICULTY[key];
    for (let i = 0; i < numberOfTrashToSpawn; i++) {
      const trash = TrashGenerator.random();
      this.state.trash.push(trash);
    }
  }
  private incrementClock() {
    if (this.gameState === "LOBBY" || this.gameState === "COMPLETE") return;
    ++this.state.clock;
    this.broadcast("clock", this.state.clock);
  }
}
