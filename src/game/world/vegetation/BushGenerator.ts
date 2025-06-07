import * as THREE from 'three';
import { BUSH_CONFIG } from './VegetationConfig';
import { OrganicShapeGenerator } from './OrganicShapeGenerator';
import { RealisticMaterialGenerator } from './RealisticMaterialGenerator';

export class BushGenerator {
  private bushModels: THREE.Object3D[] = [];
  private leafTexture: THREE.Texture;

  constructor() {
    this.leafTexture = OrganicShapeGenerator.createLeafTexture();
    this.loadBushModels();
  }

  private loadBushModels(): void {
    // Create 6 different bush variations for variety
    for (let i = 0; i < 6; i++) {
      const bush = this.createOrganicBush(i);
      this.bushModels.push(bush);
    }
    
    console.log(`🌿 Created ${this.bushModels.length} realistic bush variations with fine detail`);
  }

  private createOrganicBush(bushIndex: number): THREE.Group {
    const bushGroup = new THREE.Group();
    
    // Determine bush characteristics
    const baseRadius = BUSH_CONFIG.sizeRange[0] + 
      Math.random() * (BUSH_CONFIG.sizeRange[1] - BUSH_CONFIG.sizeRange[0]);
    
    const height = BUSH_CONFIG.heightRange[0] + 
      Math.random() * (BUSH_CONFIG.heightRange[1] - BUSH_CONFIG.heightRange[0]);
    
    // Create 3-5 layered blob structure
    const layerCount = 3 + Math.floor(Math.random() * 3); // 3-5 layers

    // Create organic blob layers (lower = larger)
    for (let layerIndex = 0; layerIndex < layerCount; layerIndex++) {
      const layer = this.createBushLayer(bushIndex, layerIndex, layerCount, baseRadius, height);
      bushGroup.add(layer);
    }

    // Add leaf overlay for fine detail
    this.addLeafOverlay(bushGroup, baseRadius, height, bushIndex);

    // Add stems with natural branching
    if (Math.random() < BUSH_CONFIG.stemChance) {
      this.addRealisticStems(bushGroup, baseRadius, height);
    }

    // Add berries/flowers with natural placement
    if (Math.random() < BUSH_CONFIG.berryChance) {
      this.addNaturalBerries(bushGroup, baseRadius, height);
    }

    // Apply final transformations
    this.applyNaturalSettling(bushGroup);

    return bushGroup;
  }

  private createBushLayer(
    bushIndex: number, 
    layerIndex: number, 
    totalLayers: number, 
    baseRadius: number, 
    maxHeight: number
  ): THREE.Mesh {
    // Layer size decreases toward top (lower = larger)
    const layerProgress = layerIndex / (totalLayers - 1);
    const layerRadius = baseRadius * (1.3 - layerProgress * 0.6); // 1.3 to 0.7 of base
    
    // Use 16-24 segments for fine detail
    const segments = 16 + Math.floor(Math.random() * 9); // 16-24
    
    // Noise intensity varies by layer
    const noiseIntensity = BUSH_CONFIG.noiseIntensityRange[0] + 
      Math.random() * (BUSH_CONFIG.noiseIntensityRange[1] - BUSH_CONFIG.noiseIntensityRange[0]);
    
    // Create organic geometry with 2-pass noise
    const geometry = OrganicShapeGenerator.createOrganicSphere(
      layerRadius, 
      segments, 
      noiseIntensity,
      4.0 + layerIndex * 0.5 // Varying noise frequency
    );

    // Apply droop effect (more pronounced on lower layers)
    const droopIntensity = BUSH_CONFIG.droopIntensity * (1 - layerProgress * 0.5);
    OrganicShapeGenerator.applyDroopEffect(geometry, droopIntensity);

    // Create realistic material with MeshPhysicalMaterial
    const material = RealisticMaterialGenerator.createFoliageMaterial(bushIndex, layerIndex);

    const mesh = new THREE.Mesh(geometry, material);

    // Position layer naturally
    const layerHeight = (layerIndex / totalLayers) * maxHeight;
    const horizontalOffset = (Math.random() - 0.5) * baseRadius * 0.3;
    
    mesh.position.set(
      horizontalOffset,
      layerHeight,
      (Math.random() - 0.5) * baseRadius * 0.2
    );

    // Apply slight scale and material variance
    const scaleVariance = 0.9 + Math.random() * 0.2; // 0.9 - 1.1
    const scale = OrganicShapeGenerator.createAsymmetricScale();
    scale.multiplyScalar(scaleVariance);
    mesh.scale.copy(scale);

    // Natural rotation
    mesh.rotation.set(
      (Math.random() - 0.5) * 0.3,
      Math.random() * Math.PI * 2,
      (Math.random() - 0.5) * 0.3
    );

    mesh.castShadow = true;
    mesh.receiveShadow = true;

    return mesh;
  }

  /**
   * Adds scattered leaf overlay for fine surface detail
   */
  private addLeafOverlay(
    bushGroup: THREE.Group, 
    baseRadius: number, 
    height: number, 
    bushIndex: number
  ): void {
    const leafCount = 40 + Math.floor(Math.random() * 21); // 40-60 leaves
    const leafMaterial = RealisticMaterialGenerator.createLeafMaterial(bushIndex, this.leafTexture);
    
    for (let i = 0; i < leafCount; i++) {
      const leafSize = 0.08 + Math.random() * 0.04; // 0.08 - 0.12
      const leafGeometry = OrganicShapeGenerator.createLeafGeometry(leafSize);
      const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
      
      // Random position around bush surface
      const angle = Math.random() * Math.PI * 2;
      const radius = baseRadius * (0.7 + Math.random() * 0.4); // 0.7 - 1.1 of bush radius
      const leafHeight = height * Math.random();
      
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      leaf.position.set(x, leafHeight, z);
      
      // Align leaf roughly outward from bush center
      const direction = new THREE.Vector3(x, 0, z).normalize();
      leaf.lookAt(leaf.position.clone().add(direction));
      
      // Add random rotation variation
      leaf.rotation.x += (Math.random() - 0.5) * 0.5;
      leaf.rotation.y += (Math.random() - 0.5) * 0.3;
      leaf.rotation.z += (Math.random() - 0.5) * 0.4;
      
      // Random scale
      const leafScale = 0.8 + Math.random() * 0.4;
      leaf.scale.set(leafScale, leafScale, leafScale);
      
      leaf.castShadow = true;
      leaf.receiveShadow = true;
      bushGroup.add(leaf);
    }
  }

  private addRealisticStems(bushGroup: THREE.Group, baseRadius: number, height: number): void {
    const stemCount = 1 + Math.floor(Math.random() * 3); // 1-3 stems
    
    for (let i = 0; i < stemCount; i++) {
      const stemHeight = height * (0.6 + Math.random() * 0.4);
      const stemRadius = 0.015 + Math.random() * 0.01;
      
      const stemGeometry = new THREE.CylinderGeometry(
        stemRadius,
        stemRadius * 1.2,
        stemHeight,
        6
      );
      
      const stemMaterial = RealisticMaterialGenerator.createStemMaterial();
      const stem = new THREE.Mesh(stemGeometry, stemMaterial);
      
      // Position stems naturally
      const angle = (i / stemCount) * Math.PI * 2 + Math.random() * 0.5;
      const distance = baseRadius * (0.3 + Math.random() * 0.4);
      
      stem.position.set(
        Math.cos(angle) * distance,
        stemHeight / 2,
        Math.sin(angle) * distance
      );
      
      // Slight lean for naturalism
      stem.rotation.z = (Math.random() - 0.5) * 0.2;
      
      stem.castShadow = true;
      stem.receiveShadow = true;
      bushGroup.add(stem);
    }
  }

  private addNaturalBerries(bushGroup: THREE.Group, baseRadius: number, height: number): void {
    const berryCount = 3 + Math.floor(Math.random() * 6); // 3-8 berries
    
    for (let i = 0; i < berryCount; i++) {
      const berrySize = 0.02 + Math.random() * 0.02;
      const berryGeometry = new THREE.SphereGeometry(berrySize, 6, 4);
      const berryMaterial = RealisticMaterialGenerator.createBerryMaterial();
      
      const berry = new THREE.Mesh(berryGeometry, berryMaterial);
      
      // Position berries on outer edges of bush
      const angle = Math.random() * Math.PI * 2;
      const distance = baseRadius * (0.8 + Math.random() * 0.3);
      const berryHeight = height * (0.3 + Math.random() * 0.5);
      
      berry.position.set(
        Math.cos(angle) * distance,
        berryHeight,
        Math.sin(angle) * distance
      );
      
      berry.castShadow = true;
      bushGroup.add(berry);
    }
  }

  private applyNaturalSettling(bushGroup: THREE.Group): void {
    // Slight overall lean for natural look
    const lean = (Math.random() - 0.5) * 0.1;
    bushGroup.rotation.z = lean;
    bushGroup.rotation.x = (Math.random() - 0.5) * 0.05;
  }

  public getBushModels(): THREE.Object3D[] {
    return this.bushModels;
  }

  public createBush(position: THREE.Vector3): THREE.Object3D | null {
    if (this.bushModels.length === 0) return null;
    
    const modelIndex = Math.floor(Math.random() * this.bushModels.length);
    const model = this.bushModels[modelIndex].clone();
    
    // Apply final random variations
    model.rotation.y = Math.random() * Math.PI * 2;
    const scale = 0.8 + Math.random() * 0.4;
    model.scale.set(scale, scale * (0.9 + Math.random() * 0.2), scale);
    
    model.position.copy(position);
    
    return model;
  }

  public dispose(): void {
    this.bushModels.forEach(bush => {
      bush.traverse(child => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    });
    this.bushModels.length = 0;
    
    if (this.leafTexture) {
      this.leafTexture.dispose();
    }
  }
}
