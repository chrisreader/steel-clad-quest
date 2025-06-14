
export class TavernLevel {
  public static getLevelData() {
    return {
      name: 'The Rusty Sword Tavern',
      description: 'A cozy tavern where adventures begin, featuring a warm central fireplace',
      backgroundMusic: 'tavern_ambient',
      lighting: {
        ambient: 0x404040,
        directional: 0xffffff
      },
      spawns: {
        player: { x: 0, y: 0, z: 0 },
        enemies: []
      },
      environment: {
        floor: {
          size: { width: 20, height: 20 },
          texture: 'wood',
          color: 0x8B4513
        },
        objects: [
          { type: 'fireplace', position: { x: 0, y: 0, z: 0 } },
          { type: 'table', position: { x: -3, y: 0.5, z: -2 } },
          { type: 'chair', position: { x: -2, y: 0.25, z: -2 } },
          { type: 'chair', position: { x: -4, y: 0.25, z: -2 } }
        ]
      }
    };
  }
}
