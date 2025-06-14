
import * as THREE from 'three';

export interface FlowerSpecies {
  name: string;
  petalCount: number;
  petalColor: THREE.Color;
  centerColor: THREE.Color;
  stemHeight: number;
  petalSize: number;
  bloomSeason: 'spring' | 'summer' | 'autumn' | 'all';
  preferredBiomes: string[];
}

export class FlowerGeometry {
  private static readonly FLOWER_SPECIES: FlowerSpecies[] = [
    {
      name: 'meadow_daisy',
      petalCount: 8,
      petalColor: new THREE.Color(0xffffff),
      centerColor: new THREE.Color(0xffff00),
      stemHeight: 0.3,
      petalSize: 0.08,
      bloomSeason: 'summer',
      preferredBiomes: ['meadow', 'normal']
    },
    {
      name: 'prairie_sunflower',
      petalCount: 12,
      petalColor: new THREE.Color(0xffd700),
      centerColor: new THREE.Color(0x8b4513),
      stemHeight: 0.6,
      petalSize: 0.12,
      bloomSeason: 'summer',
      preferredBiomes: ['prairie']
    },
    {
      name: 'meadow_poppy',
      petalCount: 4,
      petalColor: new THREE.Color(0xff4500),
      centerColor: new THREE.Color(0x000000),
      stemHeight: 0.4,
      petalSize: 0.1,
      bloomSeason: 'spring',
      preferredBiomes: ['meadow']
    },
    {
      name: 'wild_buttercup',
      petalCount: 5,
      petalColor: new THREE.Color(0xffff00),
      centerColor: new THREE.Color(0xffa500),
      stemHeight: 0.25,
      petalSize: 0.06,
      bloomSeason: 'all',
      preferredBiomes: ['normal', 'meadow']
    },
    {
      name: 'prairie_wildflower',
      petalCount: 6,
      petalColor: new THREE.Color(0x9370db),
      centerColor: new THREE.Color(0xffffff),
      stemHeight: 0.35,
      petalSize: 0.07,
      bloomSeason: 'summer',
      preferredBiomes: ['prairie', 'normal']
    }
  ];

  public static getFlowerSpecies(): FlowerSpecies[] {
    return this.FLOWER_SPECIES;
  }

  public static createFlowerGeometry(species: FlowerSpecies): THREE.Group {
    const flowerGroup = new THREE.Group();
    
    // Create stem
    const stemGeometry = new THREE.CylinderGeometry(0.005, 0.008, species.stemHeight, 4);
    const stemMaterial = new THREE.MeshPhongMaterial({ color: 0x228b22 });
    const stem = new THREE.Mesh(stemGeometry, stemMaterial);
    stem.position.y = species.stemHeight / 2;
    flowerGroup.add(stem);
    
    // Create flower head at top of stem
    const flowerHead = new THREE.Group();
    flowerHead.position.y = species.stemHeight;
    
    // Create petals
    const petalGeometry = new THREE.PlaneGeometry(species.petalSize, species.petalSize * 1.5);
    const petalMaterial = new THREE.MeshPhongMaterial({ 
      color: species.petalColor,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.9
    });
    
    for (let i = 0; i < species.petalCount; i++) {
      const petal = new THREE.Mesh(petalGeometry, petalMaterial);
      const angle = (i / species.petalCount) * Math.PI * 2;
      
      petal.position.x = Math.cos(angle) * species.petalSize * 0.7;
      petal.position.z = Math.sin(angle) * species.petalSize * 0.7;
      petal.rotation.y = angle;
      petal.rotation.x = Math.PI / 6; // Slight upward tilt
      
      flowerHead.add(petal);
    }
    
    // Create flower center
    const centerGeometry = new THREE.SphereGeometry(species.petalSize * 0.3, 6, 4);
    const centerMaterial = new THREE.MeshPhongMaterial({ color: species.centerColor });
    const center = new THREE.Mesh(centerGeometry, centerMaterial);
    center.position.y = 0.01; // Slightly above petals
    flowerHead.add(center);
    
    flowerGroup.add(flowerHead);
    
    // Add metadata
    flowerGroup.userData = {
      species: species.name,
      bloomSeason: species.bloomSeason,
      preferredBiomes: species.preferredBiomes
    };
    
    return flowerGroup;
  }

  public static createFlowerPatch(
    species: FlowerSpecies, 
    patchSize: number, 
    flowerCount: number
  ): THREE.Group {
    const patch = new THREE.Group();
    
    for (let i = 0; i < flowerCount; i++) {
      const flower = this.createFlowerGeometry(species);
      
      // Random position within patch
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * patchSize;
      
      flower.position.x = Math.cos(angle) * distance;
      flower.position.z = Math.sin(angle) * distance;
      
      // Random rotation and slight scale variation
      flower.rotation.y = Math.random() * Math.PI * 2;
      const scale = 0.8 + Math.random() * 0.4;
      flower.scale.set(scale, scale, scale);
      
      patch.add(flower);
    }
    
    return patch;
  }

  public static getSpeciesForBiome(biomeType: string, season: string = 'summer'): FlowerSpecies[] {
    return this.FLOWER_SPECIES.filter(species => 
      species.preferredBiomes.includes(biomeType) &&
      (species.bloomSeason === season || species.bloomSeason === 'all')
    );
  }
}
