
export class ForestLevel {
  public static getLevelData() {
    return {
      name: 'Darkwood Forest',
      description: 'A mysterious forest filled with danger',
      backgroundMusic: 'forest_ambient',
      lighting: {
        ambient: 0x303030,
        directional: 0xdddddd
      },
      spawns: {
        player: { x: 0, y: 0, z: 0 },
        enemies: [
          { type: 'goblin', position: { x: 5, y: 0, z: 5 } },
          { type: 'goblin', position: { x: -3, y: 0, z: 8 } },
          { type: 'orc', position: { x: 10, y: 0, z: -5 } }
        ]
      },
      environment: {
        floor: {
          size: { width: 50, height: 50 },
          texture: 'grass',
          color: 0x228B22
        },
        objects: [
          { type: 'tree', count: 20, randomPosition: true }
        ]
      }
    };
  }
}
