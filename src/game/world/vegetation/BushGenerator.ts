import * as THREE from 'three';
import { VegetationConfig, BushConfig, BushArchetype } from './VegetationConfig';
import { OrganicShapeGenerator } from './OrganicShapeGenerator';
import { RealisticMaterialGenerator } from './RealisticMaterialGenerator';

export class BushGenerator {
  private config: BushConfig;
  private shapeGenerator: OrganicShapeGenerator;
  private materialGenerator: RealisticMaterialGenerator;

  constructor(config: BushConfig = VegetationConfig.BUSH_CONFIG) {
    this.config = config;
    this.shapeGenerator = new OrganicShapeGenerator();
    this.materialGenerator = new RealisticMaterialGenerator();
  }

  public generate(archetype: BushArchetype): THREE.Group {
    const bush = new THREE.Group();
    const size = Math.random() * (archetype.sizeRange[1] - archetype.sizeRange[0]) + archetype.sizeRange[0];
    const height = Math.random() * (archetype.heightRange[1] - archetype.heightRange[0]) + archetype.heightRange[0];
    const layerCount = Math.floor(Math.random() * (archetype.layerCountRange[1] - archetype.layerCountRange[0] + 1)) + archetype.layerCountRange[0];
    const colorVariation = archetype.colorVariation;

    for (let i = 0; i < layerCount; i++) {
      const layer = this.createLayer(size, height, i, layerCount, colorVariation);
      bush.add(layer);
    }

    this.addNaturalBerries(bush, archetype);

    bush.name = archetype.name;
    return bush;
  }

  private createLayer(size: number, height: number, layerIndex: number, layerCount: number, colorVariation: number): THREE.Mesh {
    const segmentCount = Math.floor(Math.random() * (this.config.segmentRange[1] - this.config.segmentRange[0] + 1)) + this.config.segmentRange[0];
    const noiseIntensity = Math.random() * (this.config.noiseIntensityRange[1] - this.config.noiseIntensityRange[0]) + this.config.noiseIntensityRange[0];
    const color = this.materialGenerator.getRandomColor(this.config.colors, colorVariation);
    const material = new THREE.MeshPhongMaterial({ color, shininess: 20 });

    const layer = this.shapeGenerator.createOrganicShape(size, height, segmentCount, noiseIntensity, material);
    layer.position.y = (height / layerCount) * layerIndex;
    layer.rotation.y = Math.random() * Math.PI * 2;

    // Apply asymmetry
    const asymmetryFactor = this.config.asymmetryFactor;
    layer.scale.x *= (1 - asymmetryFactor / 2) + Math.random() * asymmetryFactor;
    layer.scale.z *= (1 - asymmetryFactor / 2) + Math.random() * asymmetryFactor;

    // Apply drooping effect
    const droopIntensity = this.config.droopIntensity;
    layer.position.y -= Math.pow(layerIndex / layerCount, 2) * droopIntensity;

    return layer;
  }

  private addNaturalBerries(bush: THREE.Group, archetype: BushArchetype): void {
    if (Math.random() > this.config.berryChance) return;

    const berryCount = Math.floor(Math.random() * 8) + 2;
    const berryGeometry = new THREE.SphereGeometry(0.02, 6, 4);
    
    // Berry colors based on archetype
    const berryColors = [
      0x8B0000, // Dark red
      0x4B0082, // Indigo/purple
      0x000080, // Navy blue
      0x8B4513  // Saddle brown
    ];
    
    for (let i = 0; i < berryCount; i++) {
      const berryMaterial = new THREE.MeshPhongMaterial({
        color: berryColors[Math.floor(Math.random() * berryColors.length)],
        shininess: 50
      });
      
      const berry = new THREE.Mesh(berryGeometry, berryMaterial);
      
      // Position berries on bush surface
      const angle = Math.random() * Math.PI * 2;
      const height = Math.random() * 0.8 + 0.1;
      const radius = 0.4 + Math.random() * 0.2;
      
      berry.position.set(
        Math.cos(angle) * radius,
        height,
        Math.sin(angle) * radius
      );
      
      berry.scale.setScalar(0.8 + Math.random() * 0.4);
      bush.add(berry);
    }
  }

  private addStems(bush: THREE.Group): void {
    if (Math.random() > this.config.stemChance) return;

    const stemHeight = Math.random() * 0.3 + 0.1;
    const stemRadius = 0.01;
    const stemGeometry = new THREE.CylinderGeometry(stemRadius, stemRadius, stemHeight, 4);
    const stemMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513, shininess: 20 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);

    stem.position.y = stemHeight / 2;
    stem.rotation.x = Math.random() * Math.PI / 4 - Math.PI / 8;
    stem.rotation.z = Math.random() * Math.PI / 4 - Math.PI / 8;
    bush.add(stem);
  }

  public dispose(): void {
    // Implement dispose logic here
  }
}
