import { Room, Client } from '@colyseus/core';
import { MyRoomState, Player } from './schema/MyRoomState';

export class MyRoom extends Room<MyRoomState> {
  maxClients = 4;
  update: any; // NOT GOOD PLS FIX

  onCreate(options: any) {
    this.setState(new MyRoomState());

    this.onMessage(0, (client, input) => {
      const player = this.state.players.get(client.sessionId);
      const velocity = 2;

      player.inputQueue.push(input);

      if (input.left) {
        player.x -= velocity;
      } else if (input.right) {
        player.x += velocity;
      }

      if (input.up) {
        player.y -= velocity;
      } else if (input.down) {
        player.y += velocity;
      }
    });

    // this.setSimulationInterval((deltaTime) => {
    //   this.update(deltaTime);
    // });
  }

  onJoin(client: Client, options: any) {
    console.log(client.sessionId, 'joined!');
    const mapWidth = 800;
    const mapHeight = 600;

    const player = new Player();

    player.x = Math.random() * mapWidth;
    player.y = Math.random() * mapHeight;

    this.state.players.set(client.sessionId, player);
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, 'left!');
    this.state.players.delete(client.sessionId);
  }

  onDispose() {
    console.log('room', this.roomId, 'disposing...');
  }
}
