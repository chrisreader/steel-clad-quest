
import * as THREE from 'three';

export interface NoiseLayer {
  frequency: number;
  amplitude: number;
  offset: THREE.Vector2;
}

export class EnhancedNoiseSystem {
  private static temperatureNoiseSeeds: number[] = [12345, 23456, 34567];
  private static moistureNoiseSeeds: number[] = [45678, 56789, 67890];
  private static elevationNoiseSeeds: number[] = [78901, 89012, 90123];

  // Multi-octave fractal noise for realistic terrain patterns
  public static generateFractalNoise(
    x: number, 
    z: number, 
    seeds: number[], 
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2.0
  ): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 0.001; // Base frequency for large-scale patterns
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      const octaveValue = this.simpleNoise(
        x * frequency, 
        z * frequency, 
        seeds[i % seeds.length]
      );
      
      value += octaveValue * amplitude;
      maxValue += amplitude;
      
      amplitude *= persistence;
      frequency *= lacunarity;
    }

    return value / maxValue; // Normalize to -1 to 1
  }

  // Enhanced noise function with better distribution
  private static simpleNoise(x: number, z: number, seed: number): number {
    const n = Math.sin(x * 12.9898 + z * 78.233 + seed * 37.719) * 43758.5453;
    return (n - Math.floor(n)) * 2 - 1;
  }

  // Generate temperature map (affects biome type)
  public static getTemperature(x: number, z: number): number {
    const baseTemp = this.generateFractalNoise(x, z, this.temperatureNoiseSeeds, 3, 0.6, 1.8);
    
    // Add latitude effect (distance from center)
    const distanceFromCenter = Math.sqrt(x * x + z * z) * 0.0001;
    const latitudeEffect = Math.sin(distanceFromCenter) * 0.3;
    
    return (baseTemp + latitudeEffect + 1) / 2; // Normalize to 0-1
  }

  // Generate moisture map (affects biome type)
  public static getMoisture(x: number, z: number): number {
    const baseMoisture = this.generateFractalNoise(x, z, this.moistureNoiseSeeds, 4, 0.5, 2.2);
    
    // Add river-like moisture patterns
    const riverNoise = this.generateFractalNoise(x * 0.3, z * 0.7, this.moistureNoiseSeeds, 2, 0.8, 3.0);
    const riverEffect = Math.abs(riverNoise) < 0.3 ? 0.4 : 0;
    
    return Math.min(1, (baseMoisture + riverEffect + 1) / 2); // Normalize to 0-1
  }

  // Generate elevation influence
  public static getElevation(x: number, z: number): number {
    return this.generateFractalNoise(x, z, this.elevationNoiseSeeds, 3, 0.7, 1.5);
  }

  // Create Voronoi-like biome seeds for natural clustering
  public static getBiomeSeedInfluence(x: number, z: number, seedPositions: THREE.Vector2[]): { type: string; strength: number } {
    let closestDistance = Infinity;
    let secondClosestDistance = Infinity;
    let closestType = 'normal';

    for (const seed of seedPositions) {
      const distance = Math.sqrt((x - seed.x) ** 2 + (z - seed.y) ** 2);
      
      if (distance < closestDistance) {
        secondClosestDistance = closestDistance;
        closestDistance = distance;
        closestType = this.getSeedBiomeType(seed);
      } else if (distance < secondClosestDistance) {
        secondClosestDistance = distance;
      }
    }

    // Create smooth transition between biome seeds
    const edgeDistance = secondClosestDistance - closestDistance;
    const strength = Math.min(1, Math.max(0, edgeDistance / 200)); // 200-unit transition zone

    return { type: closestType, strength };
  }

  private static getSeedBiomeType(seed: THREE.Vector2): string {
    const hash = Math.sin(seed.x * 12.9898 + seed.y * 78.233) * 43758.5453;
    const normalized = (hash - Math.floor(hash)) * 3;
    
    if (normalized < 1) return 'meadow';
    if (normalized < 2) return 'prairie';
    return 'normal';
  }

  // Generate scattered biome seed points for natural clustering
  public static generateBiomeSeeds(centerX: number, centerZ: number, radius: number, density: number = 0.0001): THREE.Vector2[] {
    const seeds: THREE.Vector2[] = [];
    const seedCount = Math.floor(radius * radius * density);
    
    for (let i = 0; i < seedCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * radius;
      
      seeds.push(new THREE.Vector2(
        centerX + Math.cos(angle) * distance,
        centerZ + Math.sin(angle) * distance
      ));
    }
    
    return seeds;
  }
}
