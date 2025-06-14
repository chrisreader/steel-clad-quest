
import * as THREE from 'three';

/**
 * Implements multi-octave fractal noise for natural-looking, organic patterns
 */
export class FractalNoiseSystem {
  private static readonly DEFAULT_SEED = 12345;

  /**
   * Generate multi-octave fractal noise at a position
   * @param position World position
   * @param seed Seed value for deterministic generation
   * @param octaves Number of noise layers
   * @param persistence How much each octave contributes
   * @param lacunarity Frequency multiplier for each octave
   * @param scale Base scale of the noise
   */
  public static getFractalNoise(
    position: THREE.Vector2 | THREE.Vector3,
    seed: number = this.DEFAULT_SEED,
    octaves: number = 4,
    persistence: number = 0.5,
    lacunarity: number = 2.0,
    scale: number = 0.005
  ): number {
    let total = 0;
    let frequency = scale;
    let amplitude = 1;
    let maxValue = 0;
    
    // Use separate seed offsets for each octave
    const seedX = seed * 1764.3;
    const seedZ = seed * 7839.1;
    
    // Add multiple octaves of noise
    for (let i = 0; i < octaves; i++) {
      // Get noise value for this octave
      const x = position instanceof THREE.Vector2 ? position.x : position.x;
      const z = position instanceof THREE.Vector2 ? position.y : position.z;
      
      const octaveValue = this.improvedNoise(
        x * frequency + seedX * i, 
        0, 
        z * frequency + seedZ * i
      );
      
      total += octaveValue * amplitude;
      
      // Track the maximum possible value for normalization
      maxValue += amplitude;
      
      // Increase frequency, decrease amplitude for next octave
      amplitude *= persistence;
      frequency *= lacunarity;
    }
    
    // Normalize to [0, 1] range
    return (total / maxValue) * 0.5 + 0.5;
  }

  /**
   * Generate domain-warped fractal noise for even more organic patterns
   * Uses one noise function to warp the input of another
   */
  public static getWarpedNoise(
    position: THREE.Vector2 | THREE.Vector3,
    seed: number = this.DEFAULT_SEED,
    warpStrength: number = 10.0
  ): number {
    // Generate warp offset using noise
    const warpX = this.getFractalNoise(
      position, 
      seed + 1357.7, 
      3, 
      0.5, 
      2.0, 
      0.01
    ) - 0.5;
    
    const warpZ = this.getFractalNoise(
      position, 
      seed + 2468.3, 
      3, 
      0.5, 
      2.0, 
      0.01
    ) - 0.5;
    
    // Create warped position
    const warpedPos = position instanceof THREE.Vector2 
      ? new THREE.Vector2(
          position.x + warpX * warpStrength,
          position.y + warpZ * warpStrength
        )
      : new THREE.Vector3(
          position.x + warpX * warpStrength,
          position.y,
          position.z + warpZ * warpStrength
        );
    
    // Generate noise using warped position
    return this.getFractalNoise(warpedPos, seed);
  }
  
  /**
   * Generate Voronoi-like cellular noise for creating natural biome clusters
   */
  public static getVoronoiNoise(
    position: THREE.Vector2 | THREE.Vector3,
    seed: number = this.DEFAULT_SEED,
    pointDensity: number = 0.005
  ): { value: number; distance: number; cellId: number } {
    // Generate cell coordinates
    const x = position instanceof THREE.Vector2 ? position.x : position.x;
    const z = position instanceof THREE.Vector2 ? position.y : position.z;
    
    const cellX = Math.floor(x * pointDensity);
    const cellZ = Math.floor(z * pointDensity);
    
    let minDistance = Number.MAX_VALUE;
    let cellId = 0;
    
    // Check current cell and neighboring cells
    for (let offsetX = -1; offsetX <= 1; offsetX++) {
      for (let offsetZ = -1; offsetZ <= 1; offsetZ++) {
        const currentCellX = cellX + offsetX;
        const currentCellZ = cellZ + offsetZ;
        
        // Create deterministic seed for this cell
        const cellSeed = seed + currentCellX * 31 + currentCellZ * 37;
        const pointRandom = this.createSeededRandom(cellSeed);
        
        // Generate feature point within this cell
        const featureX = (currentCellX + pointRandom()) / pointDensity;
        const featureZ = (currentCellZ + pointRandom()) / pointDensity;
        
        // Calculate distance to feature point
        const dx = featureX - x;
        const dz = featureZ - z;
        const distance = Math.sqrt(dx * dx + dz * dz);
        
        if (distance < minDistance) {
          minDistance = distance;
          cellId = cellSeed; // Use seed as cell ID
        }
      }
    }
    
    // Return normalized distance [0,1] and cell ID
    const value = 1.0 - Math.min(1.0, minDistance * pointDensity * 2);
    return { value, distance: minDistance, cellId };
  }
  
  /**
   * Calculate biome influence using combined noise techniques
   * This creates organic, meandering boundaries with natural clustering
   */
  public static calculateBiomeInfluence(
    position: THREE.Vector3,
    seed: number,
    biomeScale: number = 0.002
  ): { noiseValue: number; voronoiData: { value: number; distance: number; cellId: number } } {
    // Generate warped noise for organic patterns
    const warpedNoise = this.getWarpedNoise(
      position,
      seed,
      20.0
    );
    
    // Generate Voronoi data for cell-based features
    const voronoiData = this.getVoronoiNoise(
      position,
      seed,
      biomeScale * 0.25
    );
    
    // Combine the noise types
    const combinedNoise = warpedNoise * 0.7 + voronoiData.value * 0.3;
    
    return {
      noiseValue: combinedNoise,
      voronoiData
    };
  }
  
  /**
   * Create a seeded random number generator
   */
  private static createSeededRandom(seed: number): () => number {
    let current = seed;
    return () => {
      current = (current * 16807) % 2147483647;
      return (current - 1) / 2147483646;
    };
  }
  
  /**
   * Improved Perlin noise implementation (based on Ken Perlin's improved algorithm)
   */
  private static improvedNoise(x: number, y: number, z: number): number {
    // Find unit cube that contains the point
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    
    // Find relative x, y, z of point in cube
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    
    // Compute fade curves for each coordinate
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    
    // Hash coordinates of the 8 cube corners
    const p = [151,160,137,91,90,15,131,13,201,95,96,53,194,233,7,225,140,36,103,30,69,142,8,99,37,240,21,10,23,190,6,148,247,120,234,75,0,26,197,62,94,252,219,203,117,35,11,32,57,177,33,88,237,149,56,87,174,20,125,136,171,168,68,175,74,165,71,134,139,48,27,166,77,146,158,231,83,111,229,122,60,211,133,230,220,105,92,41,55,46,245,40,244,102,143,54,65,25,63,161,1,216,80,73,209,76,132,187,208,89,18,169,200,196,135,130,116,188,159,86,164,100,109,198,173,186,3,64,52,217,226,250,124,123,5,202,38,147,118,126,255,82,85,212,207,206,59,227,47,16,58,17,182,189,28,42,223,183,170,213,119,248,152,2,44,154,163,70,221,153,101,155,167,43,172,9,129,22,39,253,19,98,108,110,79,113,224,232,178,185,112,104,218,246,97,228,251,34,242,193,238,210,144,12,191,179,162,241,81,51,145,235,249,14,239,107,49,192,214,31,181,199,106,157,184,84,204,176,115,121,50,45,127,4,150,254,138,236,205,93,222,114,67,29,24,72,243,141,128,195,78,66,215,61,156,180]
      .map(x => x % 12);
    
    const a = p[(X)+p[(Y)+p[(Z)]]] % 12;
    const b = p[(X+1)+p[(Y)+p[(Z)]]] % 12;
    const c = p[(X)+p[(Y+1)+p[(Z)]]] % 12;
    const d = p[(X+1)+p[(Y+1)+p[(Z)]]] % 12;
    const e = p[(X)+p[(Y)+p[(Z+1)]]] % 12;
    const f = p[(X+1)+p[(Y)+p[(Z+1)]]] % 12;
    const g = p[(X)+p[(Y+1)+p[(Z+1)]]] % 12;
    const h = p[(X+1)+p[(Y+1)+p[(Z+1)]]] % 12;
    
    // Linear interpolation
    const du = this.grad(a, x, y, z);
    const dv = this.grad(b, x-1, y, z);
    const dw = this.grad(c, x, y-1, z);
    const dx = this.grad(d, x-1, y-1, z);
    const eu = this.grad(e, x, y, z-1);
    const ev = this.grad(f, x-1, y, z-1);
    const ew = this.grad(g, x, y-1, z-1);
    const ex = this.grad(h, x-1, y-1, z-1);
    
    // Interpolate the 8 corners gradients
    return this.lerp(w,
      this.lerp(v, 
        this.lerp(u, du, dv),
        this.lerp(u, dw, dx)
      ),
      this.lerp(v, 
        this.lerp(u, eu, ev),
        this.lerp(u, ew, ex)
      )
    );
  }
  
  private static fade(t: number): number {
    // Quintic interpolation curve
    return t * t * t * (t * (t * 6 - 15) + 10);
  }
  
  private static lerp(t: number, a: number, b: number): number {
    // Linear interpolate
    return a + t * (b - a);
  }
  
  private static grad(hash: number, x: number, y: number, z: number): number {
    // Convert LO 4 bits of hash code into 12 gradient directions
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }
}
