import * as THREE from 'three';
import { RingQuadrantSystem, RegionCoordinates } from './RingQuadrantSystem';

export interface InfiniteRingDefinition {
  baseRadius: number;
  ringWidth: number;
  difficulty: number;
  terrainColor: number;
  contentDensity: number;
  biomeType: string;
  landmarkChance: number;
}

export interface ContentDistribution {
  rockClustersPerQuadrant: { min: number; max: number };
  treeGrovesPerQuadrant: { min: number; max: number };
  bushClustersPerQuadrant: { min: number; max: number };
  landmarksPerQuadrant: { min: number; max: number };
}

export class InfiniteWorldSystem {
  private ringSystem: RingQuadrantSystem;
  private maxGeneratedRing: number = 3;
  private infiniteRingDefinitions: Map<number, InfiniteRingDefinition> = new Map();
  private generatedRegions: Set<string> = new Set();
  
  constructor(ringSystem: RingQuadrantSystem) {
    this.ringSystem = ringSystem;
    this.initializeInfiniteRings();
  }

  private initializeInfiniteRings(): void {
    // Base pattern for infinite rings
    const basePattern: InfiniteRingDefinition = {
      baseRadius: 600,
      ringWidth: 300,
      difficulty: 4,
      terrainColor: 0x2A7A2A,
      contentDensity: 1.0,
      biomeType: 'wilderness',
      landmarkChance: 0.1
    };

    // Generate first set of infinite rings
    for (let ring = 4; ring <= 20; ring++) {
      const scaleFactor = Math.pow(1.4, ring - 4);
      const difficultyProgression = Math.min(10, 4 + (ring - 4) * 0.5);
      
      const ringDef: InfiniteRingDefinition = {
        baseRadius: basePattern.baseRadius + (ring - 4) * basePattern.ringWidth * scaleFactor,
        ringWidth: basePattern.ringWidth * Math.pow(1.2, ring - 4),
        difficulty: difficultyProgression,
        terrainColor: this.generateRingColor(ring),
        contentDensity: this.calculateContentDensity(ring),
        biomeType: this.generateBiomeType(ring),
        landmarkChance: Math.min(0.3, basePattern.landmarkChance + (ring - 4) * 0.02)
      };
      
      this.infiniteRingDefinitions.set(ring, ringDef);
    }
    
    console.log(`🌍 [InfiniteWorldSystem] Initialized infinite rings 4-20 with scaling content density`);
  }

  private generateRingColor(ringIndex: number): number {
    // Progressive color evolution for distant rings
    const hue = (120 + ringIndex * 15) % 360; // Start from green, shift towards blue/purple
    const saturation = Math.max(0.3, 0.8 - ringIndex * 0.03);
    const lightness = Math.max(0.2, 0.5 - ringIndex * 0.02);
    
    return new THREE.Color().setHSL(hue / 360, saturation, lightness).getHex();
  }

  private calculateContentDensity(ringIndex: number): number {
    // Content density increases with distance for epic exploration
    const baseDensity = 1.0;
    const densityMultiplier = 1 + (ringIndex - 4) * 0.15;
    return baseDensity * densityMultiplier;
  }

  private generateBiomeType(ringIndex: number): string {
    const biomes = ['wilderness', 'ancient_forest', 'crystal_valleys', 'shadow_lands', 'mystic_peaks'];
    return biomes[Math.min(biomes.length - 1, Math.floor((ringIndex - 4) / 4))];
  }

  public generateNewRingIfNeeded(playerPosition: THREE.Vector3): boolean {
    const dx = playerPosition.x;
    const dz = playerPosition.z;
    const distanceFromCenter = Math.sqrt(dx * dx + dz * dz);
    
    // Check if we need to generate new rings
    const requiredRing = this.calculateRequiredRing(distanceFromCenter);
    
    if (requiredRing > this.maxGeneratedRing) {
      this.generateRingsUpTo(requiredRing + 2); // Generate 2 rings ahead
      return true;
    }
    
    return false;
  }

  private calculateRequiredRing(distance: number): number {
    // Calculate which ring the distance falls into
    let ringIndex = 0;
    let currentRadius = 0;
    
    // Check base rings first (0-3)
    const baseRings = [50, 150, 300, 600];
    for (let i = 0; i < baseRings.length; i++) {
      if (distance < baseRings[i]) {
        return i;
      }
      ringIndex = i + 1;
      currentRadius = baseRings[i];
    }
    
    // Check infinite rings
    for (let ring = 4; ring <= this.maxGeneratedRing + 5; ring++) {
      const ringDef = this.infiniteRingDefinitions.get(ring);
      if (ringDef && distance < ringDef.baseRadius + ringDef.ringWidth) {
        return ring;
      }
    }
    
    // Calculate new ring based on progression
    return Math.floor(4 + (distance - 600) / 400);
  }

  private generateRingsUpTo(targetRing: number): void {
    for (let ring = this.maxGeneratedRing + 1; ring <= targetRing; ring++) {
      if (!this.infiniteRingDefinitions.has(ring)) {
        this.generateInfiniteRingDefinition(ring);
      }
    }
    
    this.maxGeneratedRing = targetRing;
    console.log(`🌍 [InfiniteWorldSystem] Generated rings up to ${targetRing}`);
  }

  private generateInfiniteRingDefinition(ringIndex: number): void {
    const scaleFactor = Math.pow(1.4, ringIndex - 4);
    const difficultyProgression = Math.min(10, 4 + (ringIndex - 4) * 0.5);
    
    const ringDef: InfiniteRingDefinition = {
      baseRadius: 600 + (ringIndex - 4) * 300 * scaleFactor,
      ringWidth: 300 * Math.pow(1.2, ringIndex - 4),
      difficulty: difficultyProgression,
      terrainColor: this.generateRingColor(ringIndex),
      contentDensity: this.calculateContentDensity(ringIndex),
      biomeType: this.generateBiomeType(ringIndex),
      landmarkChance: Math.min(0.3, 0.1 + (ringIndex - 4) * 0.02)
    };
    
    this.infiniteRingDefinitions.set(ringIndex, ringDef);
  }

  public getContentDistributionForRegion(region: RegionCoordinates): ContentDistribution {
    const ringDef = this.getInfiniteRingDefinition(region.ringIndex);
    if (!ringDef) {
      // Fallback for base rings
      return this.getBaseRingContentDistribution(region.ringIndex);
    }

    // Calculate quadrant area for scaling
    const quadrantArea = this.calculateQuadrantArea(region.ringIndex);
    const baseArea = Math.PI * 50 * 50 / 4; // Base ring 0 quadrant area
    const areaScale = quadrantArea / baseArea;
    
    // Scale content based on area and density
    const densityMultiplier = ringDef.contentDensity * Math.sqrt(areaScale);
    
    return {
      rockClustersPerQuadrant: {
        min: Math.max(1, Math.floor(2 * densityMultiplier)),
        max: Math.max(2, Math.floor(5 * densityMultiplier))
      },
      treeGrovesPerQuadrant: {
        min: Math.max(1, Math.floor(1 * densityMultiplier)),
        max: Math.max(2, Math.floor(4 * densityMultiplier))
      },
      bushClustersPerQuadrant: {
        min: Math.max(2, Math.floor(3 * densityMultiplier)),
        max: Math.max(4, Math.floor(8 * densityMultiplier))
      },
      landmarksPerQuadrant: {
        min: 0,
        max: Math.random() < ringDef.landmarkChance ? 1 : 0
      }
    };
  }

  private calculateQuadrantArea(ringIndex: number): number {
    if (ringIndex <= 3) {
      // Base rings
      const radii = [50, 150, 300, 600];
      const innerRadius = ringIndex === 0 ? 0 : radii[ringIndex - 1];
      const outerRadius = radii[ringIndex];
      return Math.PI * (outerRadius * outerRadius - innerRadius * innerRadius) / 4;
    }
    
    const ringDef = this.getInfiniteRingDefinition(ringIndex);
    if (!ringDef) return 1000;
    
    const innerRadius = ringDef.baseRadius;
    const outerRadius = ringDef.baseRadius + ringDef.ringWidth;
    return Math.PI * (outerRadius * outerRadius - innerRadius * innerRadius) / 4;
  }

  private getBaseRingContentDistribution(ringIndex: number): ContentDistribution {
    const distributions: ContentDistribution[] = [
      // Ring 0 - Starter area
      {
        rockClustersPerQuadrant: { min: 1, max: 2 },
        treeGrovesPerQuadrant: { min: 0, max: 1 },
        bushClustersPerQuadrant: { min: 2, max: 4 },
        landmarksPerQuadrant: { min: 0, max: 0 }
      },
      // Ring 1 - Early exploration
      {
        rockClustersPerQuadrant: { min: 1, max: 3 },
        treeGrovesPerQuadrant: { min: 1, max: 2 },
        bushClustersPerQuadrant: { min: 3, max: 6 },
        landmarksPerQuadrant: { min: 0, max: 1 }
      },
      // Ring 2 - Mid exploration
      {
        rockClustersPerQuadrant: { min: 2, max: 4 },
        treeGrovesPerQuadrant: { min: 1, max: 3 },
        bushClustersPerQuadrant: { min: 4, max: 8 },
        landmarksPerQuadrant: { min: 0, max: 1 }
      },
      // Ring 3 - Late exploration
      {
        rockClustersPerQuadrant: { min: 3, max: 6 },
        treeGrovesPerQuadrant: { min: 2, max: 4 },
        bushClustersPerQuadrant: { min: 6, max: 12 },
        landmarksPerQuadrant: { min: 0, max: 1 }
      }
    ];
    
    return distributions[Math.min(ringIndex, distributions.length - 1)];
  }

  public getInfiniteRingDefinition(ringIndex: number): InfiniteRingDefinition | null {
    return this.infiniteRingDefinitions.get(ringIndex) || null;
  }

  public isRegionGenerated(region: RegionCoordinates): boolean {
    const regionKey = this.ringSystem.getRegionKey(region);
    return this.generatedRegions.has(regionKey);
  }

  public markRegionGenerated(region: RegionCoordinates): void {
    const regionKey = this.ringSystem.getRegionKey(region);
    this.generatedRegions.add(regionKey);
  }

  public getMaxGeneratedRing(): number {
    return this.maxGeneratedRing;
  }

  public getRingVarietyStyle(ringIndex: number): string {
    const styles = [
      'temperate',     // Rings 0-3
      'wilderness',    // Rings 4-7
      'ancient',       // Rings 8-11
      'mystical',      // Rings 12-15
      'primordial',    // Rings 16+
    ];
    
    return styles[Math.min(Math.floor(ringIndex / 4), styles.length - 1)];
  }
}