
import * as THREE from 'three';

export class AdvancedOrganicShapeGenerator {
  private static noiseCache: Map<string, number> = new Map();

  private static noise3D(x: number, y: number, z: number, octaves: number = 4, persistence: number = 0.5): number {
    const key = `${Math.round(x * 100)}_${Math.round(y * 100)}_${Math.round(z * 100)}_${octaves}_${persistence}`;
    
    if (this.noiseCache.has(key)) {
      return this.noiseCache.get(key)!;
    }

    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      const sampleX = x * frequency;
      const sampleY = y * frequency;
      const sampleZ = z * frequency;

      const noise = (
        Math.sin(sampleX * 2.5 + sampleY * 1.7 + sampleZ * 3.1) * 0.3 +
        Math.sin(sampleX * 5.2 + sampleY * 3.4 + sampleZ * 2.8) * 0.2 +
        Math.sin(sampleX * 8.1 + sampleY * 6.3 + sampleZ * 4.7) * 0.1 +
        Math.sin(sampleX * 12.3 + sampleY * 9.7 + sampleZ * 7.2) * 0.05
      ) * 0.4;

      value += noise * amplitude;
      maxValue += amplitude;
      
      amplitude *= persistence;
      frequency *= 2;
    }

    const result = value / maxValue;
    this.noiseCache.set(key, result);
    
    // Clear cache periodically to prevent memory issues
    if (this.noiseCache.size > 10000) {
      this.noiseCache.clear();
    }
    
    return result;
  }

  public static createOrganicGeometry(
    baseRadius: number,
    deformationIntensity: number = 0.3,
    deformationScale: number = 2.0
  ): THREE.BufferGeometry {
    // Start with icosahedron for more organic base than sphere
    const geometry = new THREE.IcosahedronGeometry(baseRadius, 2);
    
    if (deformationIntensity === 0) return geometry;

    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();

    // Apply organic deformation to each vertex
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Calculate noise-based displacement
      const noise = this.noise3D(
        vertex.x * deformationScale,
        vertex.y * deformationScale,
        vertex.z * deformationScale
      );
      
      // Apply deformation along the vertex normal
      const normalizedVertex = vertex.clone().normalize();
      const displacement = normalizedVertex.multiplyScalar(noise * deformationIntensity * baseRadius);
      
      vertex.add(displacement);
      
      // Add some random variation for more organic feel
      const randomVariation = new THREE.Vector3(
        (Math.random() - 0.5) * deformationIntensity * 0.3,
        (Math.random() - 0.5) * deformationIntensity * 0.3,
        (Math.random() - 0.5) * deformationIntensity * 0.3
      );
      
      vertex.add(randomVariation);
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Recalculate normals for proper lighting
    geometry.computeVertexNormals();
    
    return geometry;
  }

  public static createAsymmetricScale(asymmetryFactor: number): THREE.Vector3 {
    const baseScale = 0.8 + Math.random() * 0.4;
    
    return new THREE.Vector3(
      baseScale * (1 + (Math.random() - 0.5) * asymmetryFactor),
      baseScale * (1 + (Math.random() - 0.5) * asymmetryFactor * 0.5), // Less Y variation
      baseScale * (1 + (Math.random() - 0.5) * asymmetryFactor)
    );
  }

  public static applyDroopEffect(position: THREE.Vector3, droopFactor: number, clusterIndex: number): THREE.Vector3 {
    const droopedPosition = position.clone();
    
    // Apply drooping effect based on distance from center and height
    const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
    const droopAmount = droopFactor * distanceFromCenter * 0.5;
    
    // Lower clusters droop more
    droopedPosition.y -= droopAmount * (1 + clusterIndex * 0.2);
    
    return droopedPosition;
  }

  public static createRealisticBushGeometry(
    baseRadius: number,
    height: number,
    species: any,
    growthStage: 'juvenile' | 'mature' | 'old',
    deformationIntensity: number = 0.4,
    deformationScale: number = 1.8
  ): THREE.BufferGeometry {
    // Create more detailed base geometry for realism
    const geometry = new THREE.IcosahedronGeometry(baseRadius, 3); // Higher detail
    
    if (deformationIntensity === 0) return geometry;

    const positions = geometry.attributes.position;
    const vertex = new THREE.Vector3();
    const originalVertices: THREE.Vector3[] = [];

    // Store original positions
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      originalVertices.push(vertex.clone());
    }

    // Apply species-specific deformation
    for (let i = 0; i < positions.count; i++) {
      vertex.copy(originalVertices[i]);
      
      // Natural foliage distribution - denser at bottom, sparser at top
      const verticalPosition = (vertex.y + baseRadius) / (baseRadius * 2); // 0 to 1
      const densityFactor = this.calculateFoliageDensity(verticalPosition, species);
      
      // Multi-octave noise for realistic surface variation
      const noise = this.noise3D(
        vertex.x * deformationScale,
        vertex.y * deformationScale,
        vertex.z * deformationScale,
        4, // Multiple octaves for detail
        0.5
      );
      
      // Apply realistic deformation based on growth patterns
      const normalizedVertex = vertex.clone().normalize();
      let displacement = normalizedVertex.multiplyScalar(
        noise * deformationIntensity * baseRadius * densityFactor
      );
      
      // Add growth stage effects
      displacement = this.applyGrowthStageEffects(displacement, growthStage, vertex);
      
      // Add environmental response
      displacement = this.applyEnvironmentalEffects(displacement, vertex, species);
      
      vertex.add(displacement);
      
      // Natural asymmetry based on species characteristics
      const asymmetryRange = species.asymmetryFactor;
      const asymmetryFactor = asymmetryRange[0] + Math.random() * (asymmetryRange[1] - asymmetryRange[0]);
      
      const asymmetryVariation = new THREE.Vector3(
        (Math.random() - 0.5) * asymmetryFactor * 0.4,
        (Math.random() - 0.5) * asymmetryFactor * 0.2, // Less Y variation
        (Math.random() - 0.5) * asymmetryFactor * 0.4
      );
      
      vertex.add(asymmetryVariation);
      
      // Apply natural height variation
      vertex.y *= (height / baseRadius) * (0.8 + Math.random() * 0.4);
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }

    // Recalculate normals for proper lighting
    geometry.computeVertexNormals();
    
    return geometry;
  }

  private static calculateFoliageDensity(verticalPosition: number, species: any): number {
    // Realistic foliage distribution based on botanical patterns
    // Most bushes are denser at the bottom due to gravity and light access
    const baseDensity = 1.2 - (verticalPosition * 0.6); // Decreases with height
    
    // Species-specific density modulation
    const speciesDensity = species.density[0] + Math.random() * (species.density[1] - species.density[0]);
    
    return Math.max(0.3, baseDensity * speciesDensity);
  }

  private static applyGrowthStageEffects(
    displacement: THREE.Vector3, 
    growthStage: 'juvenile' | 'mature' | 'old',
    vertex: THREE.Vector3
  ): THREE.Vector3 {
    switch (growthStage) {
      case 'juvenile':
        // Young plants are more compact and uniform
        displacement.multiplyScalar(0.7);
        break;
      case 'mature':
        // Mature plants have full development
        break;
      case 'old':
        // Old plants may have some die-back and irregularity
        displacement.multiplyScalar(0.9);
        if (vertex.y > 0) { // Upper parts more affected
          displacement.y *= 0.8; // Some height loss
        }
        break;
    }
    
    return displacement;
  }

  private static applyEnvironmentalEffects(
    displacement: THREE.Vector3,
    vertex: THREE.Vector3,
    species: any
  ): THREE.Vector3 {
    // Simulate wind effects - slight lean
    const windDirection = new THREE.Vector3(0.1, 0, 0.05);
    if (vertex.y > 0) {
      displacement.add(windDirection.clone().multiplyScalar(vertex.y * 0.1));
    }
    
    // Simulate light competition - growth toward light
    const lightDirection = new THREE.Vector3(0.05, 0.1, 0.05);
    displacement.add(lightDirection.clone().multiplyScalar(0.2));
    
    return displacement;
  }

  public static createNaturalScale(species: any, growthStage: 'juvenile' | 'mature' | 'old'): THREE.Vector3 {
    const stageConfig = species.growthStages[growthStage];
    const widthRatio = species.widthRatio[0] + Math.random() * (species.widthRatio[1] - species.widthRatio[0]);
    
    const baseScale = stageConfig.scale * (0.85 + Math.random() * 0.3);
    const asymmetryRange = species.asymmetryFactor;
    const asymmetryFactor = asymmetryRange[0] + Math.random() * (asymmetryRange[1] - asymmetryRange[0]);
    
    return new THREE.Vector3(
      baseScale * widthRatio * (1 + (Math.random() - 0.5) * asymmetryFactor),
      baseScale * (1 + (Math.random() - 0.5) * asymmetryFactor * 0.3), // Less Y variation
      baseScale * widthRatio * (1 + (Math.random() - 0.5) * asymmetryFactor)
    );
  }

  public static applyNaturalDrooping(
    position: THREE.Vector3, 
    species: any, 
    clusterIndex: number,
    totalClusters: number
  ): THREE.Vector3 {
    const droopedPosition = position.clone();
    const droopRange = species.droopFactor;
    const droopFactor = droopRange[0] + Math.random() * (droopRange[1] - droopRange[0]);
    
    // Apply realistic drooping based on botanical physics
    const distanceFromCenter = Math.sqrt(position.x * position.x + position.z * position.z);
    const heightFactor = Math.max(0, position.y);
    
    // Outer and higher clusters droop more due to gravity and weight
    const droopAmount = droopFactor * distanceFromCenter * heightFactor * 0.3;
    
    // Progressive drooping for outer clusters
    const progressiveDroop = (clusterIndex / totalClusters) * droopFactor * 0.2;
    
    droopedPosition.y -= droopAmount + progressiveDroop;
    
    return droopedPosition;
  }

  public static createBranchStructure(
    bushGroup: THREE.Group,
    species: any,
    height: number,
    baseSize: number
  ): void {
    if (Math.random() > 0.7) return; // Not all bushes have visible branch structure
    
    const branchCount = Math.floor(2 + Math.random() * 4);
    
    for (let i = 0; i < branchCount; i++) {
      const branchHeight = height * (0.3 + Math.random() * 0.5);
      const branchRadius = Math.max(0.01, baseSize * (0.02 + Math.random() * 0.03));
      
      // Create slightly curved branch
      const branchGeometry = new THREE.CylinderGeometry(
        branchRadius * 0.6, // Thinner at top
        branchRadius * 1.2, // Thicker at bottom
        branchHeight,
        6
      );
      
      const branchMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color().setHSL(0.08, 0.4, 0.25),
        roughness: 0.95,
        metalness: 0.0
      });
      
      const branch = new THREE.Mesh(branchGeometry, branchMaterial);
      
      // Position branches naturally
      const angle = (i / branchCount) * Math.PI * 2 + Math.random() * 1.0;
      const distance = baseSize * (0.3 + Math.random() * 0.4);
      
      branch.position.set(
        Math.cos(angle) * distance,
        branchHeight / 2 + Math.random() * 0.2,
        Math.sin(angle) * distance
      );
      
      // Natural branch angles
      branch.rotation.set(
        (Math.random() - 0.5) * 0.4,
        angle + (Math.random() - 0.5) * 0.5,
        (Math.random() - 0.5) * 0.3
      );
      
      branch.castShadow = true;
      branch.receiveShadow = true;
      bushGroup.add(branch);
    }
  }
}
