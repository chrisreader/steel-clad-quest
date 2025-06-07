
import * as THREE from 'three';
import { BushSpecies } from './VegetationConfig';

export class OrganicBushMaterials {
  private textureLoader: THREE.TextureLoader;

  constructor() {
    this.textureLoader = new THREE.TextureLoader();
  }

  public createFoliageMaterial(species: BushSpecies, variationIndex: number): THREE.MeshStandardMaterial {
    const colorIndex = variationIndex % species.colors.length;
    const baseColor = species.colors[colorIndex].clone();
    
    // Add natural color variation
    const hsl = { h: 0, s: 0, l: 0 };
    baseColor.getHSL(hsl);
    hsl.h += (Math.random() - 0.5) * 0.03;
    hsl.s += (Math.random() - 0.5) * 0.15;
    hsl.l += (Math.random() - 0.5) * 0.12;
    baseColor.setHSL(hsl.h, Math.max(0.1, hsl.s), Math.max(0.1, hsl.l));

    const material = new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: 0.85 + Math.random() * 0.1,
      metalness: 0.0,
      transparent: true,
      opacity: 0.88 + species.foliageDensity * 0.12,
      side: THREE.DoubleSide, // Important for organic shapes
    });

    // Add subsurface scattering effect for realism
    material.transmission = 0.1;
    material.thickness = 0.5;

    return material;
  }

  public createBranchMaterial(species: BushSpecies): THREE.MeshStandardMaterial {
    const branchColors = [0x4A3A2A, 0x3A2A1A, 0x5A4A3A, 0x6A5A4A];
    const colorIndex = Math.floor(Math.random() * branchColors.length);
    
    return new THREE.MeshStandardMaterial({
      color: branchColors[colorIndex],
      roughness: 0.95,
      metalness: 0.0,
      normalScale: new THREE.Vector2(0.5, 0.5),
    });
  }

  public createVariationMaterial(baseMaterial: THREE.MeshStandardMaterial, variation: number): THREE.MeshStandardMaterial {
    const material = baseMaterial.clone();
    
    // Vary the color slightly for each cluster
    const color = material.color.clone();
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    
    hsl.h += (variation - 0.5) * 0.02;
    hsl.l += (variation - 0.5) * 0.1;
    color.setHSL(hsl.h, hsl.s, Math.max(0.1, Math.min(0.9, hsl.l)));
    
    material.color = color;
    material.roughness += (variation - 0.5) * 0.1;
    
    return material;
  }
}
