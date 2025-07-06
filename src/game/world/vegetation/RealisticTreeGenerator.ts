
import * as THREE from 'three';
import { TextureGenerator } from '../../utils';
import { TreeSpeciesType, TreeSpeciesManager } from './TreeSpecies';
import { OrganicShapeGenerator } from './OrganicShapeGenerator';

interface BranchConfig {
  length: number;
  thickness: number;
  attachmentPoint: THREE.Vector3;
  direction: THREE.Vector3;
  species: TreeSpeciesType;
  treeHeight: number;
  branchLevel: number; // 0=main, 1=secondary, 2=tertiary
}

interface FoliageCluster {
  position: THREE.Vector3;
  size: number;
  density: number;
  heightRatio: number; // Added for height-based scaling
}

export class RealisticTreeGenerator {
  private textureCache: Map<string, THREE.Texture> = new Map();
  private foliageGeometryCache: Map<string, THREE.BufferGeometry> = new Map();
  private materialCache: Map<string, THREE.Material> = new Map();
  private activeFoliageMaterials: Set<THREE.MeshStandardMaterial> = new Set();
  private activeTrunkMaterials: Set<THREE.MeshStandardMaterial> = new Set();
  private debugMode: boolean = false;

  constructor() {
    this.preloadTextures();
    this.preloadOptimizedGeometries();
  }

  private preloadTextures(): void {
    // Create specialized bark textures with enhanced detail
    this.textureCache.set('bark', this.createOakBarkTexture());
    this.textureCache.set('birch', this.createBirchTexture());
    this.textureCache.set('weathered', this.createWeatheredTexture());
    this.textureCache.set('pine', this.createPineBarkTexture());
  }

  private preloadOptimizedGeometries(): void {
    // Pre-create organic foliage geometries for different LOD levels and species
    for (let lod = 0; lod < 3; lod++) {
      const segments = lod === 0 ? 16 : lod === 1 ? 12 : 8;
      const rings = lod === 0 ? 12 : lod === 1 ? 8 : 6;
      
      // Create multiple organic shape variations
      for (let variant = 0; variant < 4; variant++) {
        const geometry = this.createOrganicFoliageGeometry(segments, rings, variant);
        this.foliageGeometryCache.set(`foliage_lod${lod}_v${variant}`, geometry);
      }
      
      // Create special birch irregular foliage geometry
      const birchGeometry = this.createBirchIrregularFoliageGeometry(segments, rings);
      this.foliageGeometryCache.set(`foliage_lod${lod}_birch_irregular`, birchGeometry);
    }
  }

  private createOrganicFoliageGeometry(segments: number, rings: number, variant: number): THREE.BufferGeometry {
    // Use OrganicShapeGenerator for much more realistic foliage shapes
    const baseRadius = 1;
    
    // Different organic patterns per variant for species differentiation
    switch (variant) {
      case 0: // Oak-style: broad, flattened canopy masses
        return OrganicShapeGenerator.createOrganicSphere(
          baseRadius, 
          segments, 
          0.15, // Higher noise intensity for natural variation
          2.8   // Medium frequency for broad shapes
        );
        
      case 1: // Willow-style: drooping, asymmetric masses
        const willowGeometry = OrganicShapeGenerator.createOrganicSphere(
          baseRadius, 
          segments, 
          0.18, // More variation for drooping effect
          3.2
        );
        // Additional vertical stretching for drooping effect
        const willowPositions = willowGeometry.attributes.position;
        for (let i = 0; i < willowPositions.count; i++) {
          const y = willowPositions.getY(i);
          willowPositions.setY(i, y * 1.2); // Stretch vertically
        }
        willowGeometry.computeVertexNormals();
        return willowGeometry;
        
      case 2: // Dense, compact masses with natural gaps
        return OrganicShapeGenerator.createOrganicSphere(
          baseRadius, 
          segments, 
          0.20, // High variation for natural density
          4.0   // Higher frequency for detailed surface
        );
        
      case 3: // Highly irregular, natural masses
        return OrganicShapeGenerator.createOrganicSphere(
          baseRadius, 
          segments, 
          0.22, // Maximum variation for irregular shapes
          3.5   // Balanced frequency
        );
        
      default:
        return OrganicShapeGenerator.createOrganicSphere(baseRadius, segments);
    }
  }

  private createBirchIrregularFoliageGeometry(segments: number, rings: number): THREE.BufferGeometry {
    // Use OrganicShapeGenerator for birch-specific irregular shapes
    const birchGeometry = OrganicShapeGenerator.createOrganicSphere(
      1,        // Base radius
      segments, // Geometry detail level
      0.25,     // High noise intensity for maximum irregularity
      4.5       // Higher frequency for fine detail
    );
    
    // Additional birch-specific modifications for delicate, irregular appearance
    const positions = birchGeometry.attributes.position;
    const vertex = new THREE.Vector3();
    
    for (let i = 0; i < positions.count; i++) {
      vertex.fromBufferAttribute(positions, i);
      
      // Birch-specific vertical compression for flatter canopy
      vertex.y *= 0.75 + Math.random() * 0.15; // 75-90% height
      
      // Create natural gaps and indentations specific to birch foliage
      const angle = Math.atan2(vertex.z, vertex.x);
      const gapPattern = Math.sin(angle * 6) * Math.cos(vertex.y * 8);
      if (gapPattern > 0.4) {
        // Reduce size to create gaps
        vertex.multiplyScalar(0.85 + Math.random() * 0.1);
      }
      
      // Asymmetric horizontal bulging for natural irregular shape
      const bulgeNoise = Math.sin(angle * 4) * 0.12;
      vertex.x += bulgeNoise;
      vertex.z += Math.cos(angle * 4) * 0.08;
      
      positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
    }
    
    birchGeometry.computeVertexNormals();
    return birchGeometry;
  }

  private createOakBarkTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Rich brown base with texture
    ctx.fillStyle = '#5D4037';
    ctx.fillRect(0, 0, 512, 512);

    // Add bark furrows and ridges
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 3;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 25 + Math.random() * 10);
      ctx.quadraticCurveTo(256, i * 25 + Math.random() * 20, 512, i * 25 + Math.random() * 10);
      ctx.stroke();
    }

    // Vertical texture lines
    for (let i = 0; i < 15; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 35, 0);
      ctx.lineTo(i * 35 + Math.random() * 20 - 10, 512);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createPineBarkTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Reddish-brown pine bark base
    ctx.fillStyle = '#8D4004';
    ctx.fillRect(0, 0, 512, 512);

    // Plated bark pattern
    ctx.fillStyle = '#A0522D';
    for (let y = 0; y < 512; y += 40) {
      for (let x = 0; x < 512; x += 30) {
        const size = 20 + Math.random() * 15;
        ctx.fillRect(x + Math.random() * 10, y + Math.random() * 10, size, size);
      }
    }

    // Dark cracks between plates
    ctx.strokeStyle = '#2F1B0C';
    ctx.lineWidth = 2;
    for (let i = 0; i < 30; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createBirchTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // White birch base with slight cream tint
    ctx.fillStyle = '#F8F8F0';
    ctx.fillRect(0, 0, 512, 512);

    // Characteristic black horizontal markings
    ctx.fillStyle = '#1C1C1C';
    for (let i = 0; i < 12; i++) {
      const y = Math.random() * 512;
      const height = 5 + Math.random() * 15;
      const segments = 3 + Math.floor(Math.random() * 4);
      
      for (let j = 0; j < segments; j++) {
        const x = j * (512 / segments) + Math.random() * 20;
        const width = 30 + Math.random() * 40;
        ctx.fillRect(x, y, width, height);
      }
    }

    // Add subtle vertical texture lines
    ctx.strokeStyle = '#E0E0E0';
    ctx.lineWidth = 1;
    for (let i = 0; i < 20; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 25, 0);
      ctx.lineTo(i * 25 + Math.random() * 10 - 5, 512);
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  private createWeatheredTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;

    // Dark weathered base
    ctx.fillStyle = '#2C1810';
    ctx.fillRect(0, 0, 512, 512);

    // Add weathering and cracks
    ctx.strokeStyle = '#1A0E08';
    ctx.lineWidth = 3;
    for (let i = 0; i < 25; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * 512, Math.random() * 512);
      ctx.lineTo(Math.random() * 512, Math.random() * 512);
      ctx.stroke();
    }

    // Peeling bark patches
    ctx.fillStyle = '#3A2419';
    for (let i = 0; i < 15; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const size = 20 + Math.random() * 30;
      ctx.fillRect(x, y, size, size);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  public createTree(species: TreeSpeciesType, position: THREE.Vector3): THREE.Object3D {
    const tree = new THREE.Group();

    const height = TreeSpeciesManager.getRandomHeight(species);
    const baseRadius = TreeSpeciesManager.getRandomTrunkRadius(species);

    console.log(`🌲 Creating realistic ${species} tree: height=${height.toFixed(2)}, radius=${baseRadius.toFixed(2)}`);

    // Create trunk
    const trunk = this.createRealisticTrunk(species, height, baseRadius);
    tree.add(trunk);

    // Create complete branch and crown system
    const { branches, foliageClusters } = this.createRealisticTreeStructure(species, height, baseRadius);
    
    // Add all branches
    branches.forEach(branch => tree.add(branch));
    
    // Debug: Log foliage cluster information
    console.log(`🍃 Tree ${species} has ${foliageClusters.length} foliage clusters`);
    
    // Create optimized unified foliage with fallback
    const unifiedFoliage = this.createOptimizedFoliage(foliageClusters, species, height);
    if (unifiedFoliage) {
      tree.add(unifiedFoliage);
      console.log(`🍃 Successfully added foliage to ${species} tree`);
    } else {
      console.warn(`🚨 Failed to create foliage for ${species} tree, using fallback`);
      // Fallback: Create individual foliage meshes
      const fallbackFoliage = this.createFallbackFoliage(foliageClusters, species);
      fallbackFoliage.forEach(mesh => tree.add(mesh));
    }

    // Position and scale tree
    tree.position.copy(position);
    const scale = 0.8 + Math.random() * 0.4;
    tree.scale.set(scale, scale * (0.95 + Math.random() * 0.1), scale);
    tree.rotation.y = Math.random() * Math.PI * 2;

    return tree;
  }

  private createRealisticTreeStructure(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];

    if (species === TreeSpeciesType.PINE) {
      return this.createPineTreeStructure(treeHeight, trunkBaseRadius);
    }

    // Create lower trunk branches (20-50% height) - sparse, smaller foliage
    const lowerBranches = this.createLowerBranches(species, treeHeight, trunkBaseRadius);
    branches.push(...lowerBranches.branches);
    foliageClusters.push(...lowerBranches.foliageClusters);

    // Create main crown branches (50-85% height) - medium foliage, growing larger
    const crownBranches = this.createCrownBranches(species, treeHeight, trunkBaseRadius);
    branches.push(...crownBranches.branches);
    foliageClusters.push(...crownBranches.foliageClusters);

    // Create upper crown branches (85-95% height) - largest, densest foliage
    const upperCrown = this.createUpperCrown(species, treeHeight, trunkBaseRadius);
    branches.push(...upperCrown.branches);
    foliageClusters.push(...upperCrown.foliageClusters);

    return { branches, foliageClusters };
  }

  private createLowerBranches(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    // Significantly reduced branch counts to avoid over-clustering
    let branchCount: number;
    switch (species) {
      case TreeSpeciesType.OAK:
        branchCount = 2; // Reduced from 4 - fewer, larger foliage masses
        break;
      case TreeSpeciesType.WILLOW:
        branchCount = 3; // Reduced from 6
        break;
      case TreeSpeciesType.BIRCH:
        branchCount = 1; // Reduced from 2 for minimal lower foliage
        break;
      default:
        branchCount = 2;
    }
    
    for (let i = 0; i < branchCount; i++) {
      const heightRatio = 0.2 + (i / branchCount) * 0.3; // 20-50% height
      const attachmentHeight = treeHeight * heightRatio;
      const angle = (i / branchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.6;
      
      const trunkRadiusAtHeight = trunkBaseRadius * (1 - heightRatio * 0.6);
      
      // Species-specific branch length multipliers
      let lengthMultiplier = 0.2 + Math.random() * 0.15;
      if (species === TreeSpeciesType.BIRCH) {
        lengthMultiplier *= 0.6; // Birch branches 60% of normal length
      }
      const branchLength = treeHeight * lengthMultiplier;
      const branchThickness = Math.max(0.12, trunkRadiusAtHeight * (0.25 + Math.random() * 0.15));
      
      const attachmentPoint = new THREE.Vector3(
        Math.cos(angle) * trunkRadiusAtHeight,
        attachmentHeight,
        Math.sin(angle) * trunkRadiusAtHeight
      );
      
      // Species-specific branch angles - make birch branches more upward
      let upwardBias = 0.1 + Math.random() * 0.2;
      if (species === TreeSpeciesType.BIRCH) {
        upwardBias = 0.3 + Math.random() * 0.3; // More upward angled branches
      }
      
      const direction = new THREE.Vector3(
        Math.cos(angle),
        upwardBias,
        Math.sin(angle)
      ).normalize();
      
      const branchResult = this.createBranchWithHierarchy({
        length: branchLength,
        thickness: branchThickness,
        attachmentPoint,
        direction,
        species,
        treeHeight,
        branchLevel: 0
      }, heightRatio);
      
      branches.push(...branchResult.branches);
      foliageClusters.push(...branchResult.foliageClusters);
    }
    
    return { branches, foliageClusters };
  }

  private createCrownBranches(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    // Dramatically reduced branch counts to create fewer, larger foliage masses
    let branchCount: number;
    switch (species) {
      case TreeSpeciesType.OAK:
        branchCount = 4; // Reduced from 8 - creates 4 large foliage masses
        break;
      case TreeSpeciesType.WILLOW:
        branchCount = 5; // Reduced from 10
        break;
      case TreeSpeciesType.BIRCH:
        branchCount = 3; // Reduced from 4 for clean, minimal appearance
        break;
      default:
        branchCount = 4;
    }
    
    for (let i = 0; i < branchCount; i++) {
      const heightRatio = 0.5 + (i / branchCount) * 0.35; // 50-85% height
      const attachmentHeight = treeHeight * heightRatio;
      const angle = (i / branchCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.8;
      
      const trunkRadiusAtHeight = trunkBaseRadius * (1 - heightRatio * 0.7);
      
      // Species-specific branch length multipliers
      let lengthMultiplier = 0.25 + Math.random() * 0.15;
      if (species === TreeSpeciesType.BIRCH) {
        lengthMultiplier *= 0.7; // Birch branches shorter
      }
      const branchLength = treeHeight * lengthMultiplier;
      const branchThickness = Math.max(0.1, trunkRadiusAtHeight * (0.3 + Math.random() * 0.15));
      
      const attachmentPoint = new THREE.Vector3(
        Math.cos(angle) * trunkRadiusAtHeight,
        attachmentHeight,
        Math.sin(angle) * trunkRadiusAtHeight
      );
      
      let direction: THREE.Vector3;
      if (species === TreeSpeciesType.WILLOW) {
        direction = new THREE.Vector3(Math.cos(angle), -0.2 - Math.random() * 0.3, Math.sin(angle)).normalize();
      } else if (species === TreeSpeciesType.BIRCH) {
        // Birch branches more upward angled
        direction = new THREE.Vector3(Math.cos(angle), 0.4 + Math.random() * 0.3, Math.sin(angle)).normalize();
      } else {
        direction = new THREE.Vector3(Math.cos(angle), 0.2 + Math.random() * 0.3, Math.sin(angle)).normalize();
      }
      
      const branchResult = this.createBranchWithHierarchy({
        length: branchLength,
        thickness: branchThickness,
        attachmentPoint,
        direction,
        species,
        treeHeight,
        branchLevel: 0
      }, heightRatio);
      
      branches.push(...branchResult.branches);
      foliageClusters.push(...branchResult.foliageClusters);
    }
    
    return { branches, foliageClusters };
  }

  private createUpperCrown(species: TreeSpeciesType, treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    if (species === TreeSpeciesType.DEAD) {
      return { branches, foliageClusters }; // Dead trees don't have upper crowns
    }
    
    // Reduced upper crown branch counts for larger foliage masses
    let branchCount: number;
    switch (species) {
      case TreeSpeciesType.OAK:
        branchCount = 3; // Reduced from 8 - creates 3 large upper masses
        break;
      case TreeSpeciesType.BIRCH:
        branchCount = 2; // Reduced from 3 for minimal upper foliage
        break;
      default:
        branchCount = 3;
    }
    
    for (let i = 0; i < branchCount; i++) {
      const heightRatio = 0.85 + (i / branchCount) * 0.1; // 85-95% height
      const attachmentHeight = treeHeight * heightRatio;
      const angle = (i / branchCount) * Math.PI * 2 + Math.random();
      
      const trunkRadiusAtHeight = trunkBaseRadius * (1 - heightRatio * 0.8);
      
      // Species-specific branch length for upper crown
      let lengthMultiplier = 0.15 + Math.random() * 0.1;
      if (species === TreeSpeciesType.BIRCH) {
        lengthMultiplier *= 0.8; // Shorter birch upper branches
      }
      const branchLength = treeHeight * lengthMultiplier;
      const branchThickness = Math.max(0.08, trunkRadiusAtHeight * (0.2 + Math.random() * 0.1));
      
      const attachmentPoint = new THREE.Vector3(
        Math.cos(angle) * trunkRadiusAtHeight,
        attachmentHeight,
        Math.sin(angle) * trunkRadiusAtHeight
      );
      
      // Species-specific direction for upper crown branches
      let direction: THREE.Vector3;
      if (species === TreeSpeciesType.BIRCH) {
        // Birch upper branches more vertical and delicate
        direction = new THREE.Vector3(
          Math.cos(angle) * 0.5,
          0.6 + Math.random() * 0.3,
          Math.sin(angle) * 0.5
        ).normalize();
      } else {
        direction = new THREE.Vector3(
          Math.cos(angle) * 0.7,
          0.3 + Math.random() * 0.4,
          Math.sin(angle) * 0.7
        ).normalize();
      }
      
      const branchResult = this.createBranchWithHierarchy({
        length: branchLength,
        thickness: branchThickness,
        attachmentPoint,
        direction,
        species,
        treeHeight,
        branchLevel: 0
      }, heightRatio);
      
      branches.push(...branchResult.branches);
      foliageClusters.push(...branchResult.foliageClusters);
    }
    
    // Species-specific central crown clustering
    if (species === TreeSpeciesType.BIRCH) {
      // Birch: Create multiple smaller, scattered foliage clusters instead of large central ones
      this.createBirchUpperFoliageClusters(foliageClusters, treeHeight);
    } else {
      // Oak and other species: Large overlapping central crown clusters - reduced count
      const centralHeightStart = 0.8;
      const centralHeightEnd = 0.95;
      const centralClusterCount = species === TreeSpeciesType.OAK ? 2 : 2; // Reduced from 4/3 to 2/2
      
      for (let i = 0; i < centralClusterCount; i++) {
        const heightRatio = centralHeightStart + (i / (centralClusterCount - 1)) * (centralHeightEnd - centralHeightStart);
        const centralHeight = treeHeight * heightRatio;
        
        // Calculate size based on height and species - realistic central canopy
        const baseSize = this.calculateFoliageSize(treeHeight, heightRatio, species);
        let centralFoliageSize = baseSize * (1.8 + Math.random() * 0.7); // Reduced to 1.8-2.5x for realistic proportions
        
        // Oak trees get slightly larger canopies but still realistic
        if (species === TreeSpeciesType.OAK) {
          centralFoliageSize *= 1.1; // Reduced from 1.5 to 1.1
        }
        
        // Add slight horizontal offset for natural variation
        const offsetRadius = treeHeight * 0.05;
        const offsetAngle = Math.random() * Math.PI * 2;
        const position = new THREE.Vector3(
          Math.cos(offsetAngle) * offsetRadius,
          centralHeight,
          Math.sin(offsetAngle) * offsetRadius
        );
        
        foliageClusters.push({
          position,
          size: centralFoliageSize,
          density: 1.0,
          heightRatio
        });
      }
    }
    
    return { branches, foliageClusters };
  }
  
  private createBirchUpperFoliageClusters(foliageClusters: FoliageCluster[], treeHeight: number): void {
    // Create irregular, fewer foliage clusters for realistic birch canopy
    const clusterCount = 3 + Math.floor(Math.random() * 2); // Reduced from 6-9 to 3-4 clusters
    
    for (let i = 0; i < clusterCount; i++) {
      const heightRatio = 0.75 + Math.random() * 0.2; // 75-95% height
      const centralHeight = treeHeight * heightRatio;
      
      // Create gaps and irregular distribution
      const angle = Math.random() * Math.PI * 2;
      const radius = (Math.random() * 0.8 + 0.2) * treeHeight * 0.15; // Scattered positions
      
      const position = new THREE.Vector3(
        Math.cos(angle) * radius,
        centralHeight,
        Math.sin(angle) * radius
      );
      
      // Larger birch foliage clusters for better visibility
      const baseSize = this.calculateFoliageSize(treeHeight, heightRatio, TreeSpeciesType.BIRCH);
      const clusterSize = baseSize * (1.6 + Math.random() * 0.6); // Adjusted to 160-220% for balanced birch foliage
      
      // Lower density to create natural gaps
      const density = 0.6 + Math.random() * 0.3; // 60-90% density
      
      foliageClusters.push({
        position,
        size: clusterSize,
        density,
        heightRatio
      });
    }
  }

  private calculateFoliageSize(treeHeight: number, heightRatio: number, species: TreeSpeciesType): number {
    // Base size calculation - realistic proportions
    let baseSize = treeHeight * 0.05; // Reduced from 0.08 to more realistic 0.05
    
    // Height-based scaling for natural density distribution
    const heightFactor = 0.5 + heightRatio * 1.5; // Scale from 50% at bottom to 200% at top
    baseSize *= heightFactor;
    
    // Species-specific size adjustments
    switch (species) {
      case TreeSpeciesType.BIRCH:
        baseSize *= 1.4; // Birch gets moderately larger foliage clusters
        break;
      case TreeSpeciesType.OAK:
        baseSize *= 1.0;
        break;
      case TreeSpeciesType.WILLOW:
        baseSize *= 1.1;
        break;
    }
    
    return baseSize;
  }

  private calculateFoliageDensity(heightRatio: number, species: TreeSpeciesType): number {
    let density: number;
    
    if (heightRatio < 0.5) {
      // Lower branches: 0.6-0.7 density (sparse)
      density = 0.6 + (heightRatio / 0.5) * 0.1;
    } else if (heightRatio < 0.85) {
      // Mid crown: 0.7-0.9 density (medium)
      const midRatio = (heightRatio - 0.5) / 0.35;
      density = 0.7 + midRatio * 0.2;
    } else {
      // Upper crown: 0.9-1.0 density (dense)
      const upperRatio = (heightRatio - 0.85) / 0.15;
      density = 0.9 + upperRatio * 0.1;
    }
    
    // Add slight random variation
    density += (Math.random() - 0.5) * 0.1;
    
    return Math.max(0.5, Math.min(1.0, density));
  }

  private createBranchWithHierarchy(config: BranchConfig, parentHeightRatio: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    // Create main branch
    const mainBranch = this.createOptimizedBranch(config);
    branches.push(mainBranch);
    
    // Add foliage at branch end with height-based sizing
    const endPosition = config.direction.clone()
      .multiplyScalar(config.length)
      .add(config.attachmentPoint);
    
    const heightRatio = endPosition.y / config.treeHeight;
    const foliageSize = this.calculateFoliageSize(config.treeHeight, heightRatio, config.species);
    const foliageDensity = this.calculateFoliageDensity(heightRatio, config.species);
    
    foliageClusters.push({
      position: endPosition,
      size: foliageSize,
      density: foliageDensity,
      heightRatio
    });
    
    // Create secondary branches if not at max level
    if (config.branchLevel < 2) {
      const secondaryCount = config.branchLevel === 0 ? 3 + Math.floor(Math.random() * 3) : 2;
      
      for (let i = 0; i < secondaryCount; i++) {
        const positionRatio = 0.4 + (i / secondaryCount) * 0.4;
        const localPosition = config.direction.clone()
          .multiplyScalar(config.length * positionRatio);
        const worldPosition = localPosition.add(config.attachmentPoint);
        
        const sideVector = new THREE.Vector3(-config.direction.z, 0, config.direction.x).normalize();
        const randomAngle = (Math.random() - 0.5) * Math.PI * 0.6;
        const upwardBias = config.branchLevel === 0 ? 0.1 + Math.random() * 0.2 : 0.05;
        
        const secondaryDirection = config.direction.clone()
          .multiplyScalar(0.5)
          .add(sideVector.multiplyScalar(Math.sin(randomAngle) * 0.8))
          .add(new THREE.Vector3(0, upwardBias, 0))
          .normalize();
        
        const secondaryLength = config.length * (0.4 + Math.random() * 0.3);
        const secondaryThickness = Math.max(0.05, config.thickness * (0.5 + Math.random() * 0.2));
        
        const secondaryHeightRatio = worldPosition.y / config.treeHeight;
        const secondaryResult = this.createBranchWithHierarchy({
          length: secondaryLength,
          thickness: secondaryThickness,
          attachmentPoint: worldPosition,
          direction: secondaryDirection,
          species: config.species,
          treeHeight: config.treeHeight,
          branchLevel: config.branchLevel + 1
        }, secondaryHeightRatio);
        
        branches.push(...secondaryResult.branches);
        foliageClusters.push(...secondaryResult.foliageClusters);
      }
    }
    
    return { branches, foliageClusters };
  }

  private createOptimizedBranch(config: BranchConfig): THREE.Mesh {
    const segments = config.branchLevel === 0 ? 8 : 6;
    const geometry = new THREE.CylinderGeometry(
      config.thickness * 0.3,
      config.thickness,
      config.length,
      segments,
      1
    );
    
    const material = this.getOptimizedBranchMaterial(config.species);
    const branch = new THREE.Mesh(geometry, material);
    
    // Position and orient branch
    branch.position.copy(config.attachmentPoint);
    branch.position.add(config.direction.clone().multiplyScalar(config.length / 2));
    
    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion();
    quaternion.setFromUnitVectors(up, config.direction);
    branch.setRotationFromQuaternion(quaternion);
    
    branch.castShadow = true;
    branch.receiveShadow = true;
    
    return branch;
  }

  private getOptimizedBranchMaterial(species: TreeSpeciesType): THREE.Material {
    const materialKey = `branch_${species}`;
    
    if (!this.materialCache.has(materialKey)) {
      const texture = this.textureCache.get(species === TreeSpeciesType.PINE ? 'pine' : 'bark');
      const material = new THREE.MeshStandardMaterial({
        color: 0xA0522D, // Brighter bark color
        map: texture,
        roughness: 0.8, // Slightly less rough for better light reflection
        metalness: 0.0
      });
      this.materialCache.set(materialKey, material);
      // Track trunk materials for day/night updates
      this.activeTrunkMaterials.add(material);
    }
    
    return this.materialCache.get(materialKey)!;
  }

  private createOptimizedFoliage(clusters: FoliageCluster[], species: TreeSpeciesType, treeHeight: number): THREE.Mesh | null {
    if (clusters.length === 0) {
      console.warn('🚨 No foliage clusters provided');
      return null;
    }
    
    console.log(`🍃 Creating instanced foliage with ${clusters.length} clusters for ${species}`);
    
    // Validate clusters
    const validClusters = clusters.filter(cluster => {
      const isValid = cluster.position && cluster.size > 0 && cluster.density > 0;
      if (!isValid) {
        console.warn('🚨 Invalid foliage cluster:', cluster);
      }
      return isValid;
    });
    
    if (validClusters.length === 0) {
      console.warn('🚨 No valid foliage clusters after filtering');
      return null;
    }
    
    try {
      // Select organic geometry variant based on species
      let baseGeometry: THREE.BufferGeometry;
      if (species === TreeSpeciesType.BIRCH) {
        // Use special irregular birch geometry
        baseGeometry = this.foliageGeometryCache.get(`foliage_lod0_birch_irregular`)!;
      } else {
        const variantIndex = this.getSpeciesGeometryVariant(species);
        baseGeometry = this.foliageGeometryCache.get(`foliage_lod0_v${variantIndex}`)!;
      }
      
      // Create instanced mesh with organic geometry
      const material = this.getRealisticFoliageMaterial(species);
      const instancedMesh = new THREE.InstancedMesh(baseGeometry, material, validClusters.length);
      
      // Create transformation matrices for each foliage cluster
      for (let i = 0; i < validClusters.length; i++) {
        const cluster = validClusters[i];
        const matrix = new THREE.Matrix4();
        
        // Create proper transformation matrix using compose
        const position = cluster.position.clone();
        const rotation = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, Math.random() * Math.PI * 2, 0)
        );
        
        // Apply asymmetric scaling based on species for organic appearance
        const asymmetricScale = this.getSpeciesAsymmetricScale(species, cluster.size);
        
        matrix.compose(position, rotation, asymmetricScale);
        instancedMesh.setMatrixAt(i, matrix);
        
        // Since vertexColors is now disabled, skip instance color variations
        // The bright base material color will be used instead
        console.log(`🍃 Skipping instance colors - using bright base material color for ${species}`);
        
        // Optional: Still set a bright instance color as backup
        const brightColor = new THREE.Color(this.getSpeciesNaturalColor(species));
        instancedMesh.setColorAt(i, brightColor);
      }
      
      // Update instance matrices and colors
      instancedMesh.instanceMatrix.needsUpdate = true;
      if (instancedMesh.instanceColor) {
        instancedMesh.instanceColor.needsUpdate = true;
      }
      
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true; // Re-enable shadow receiving for realistic lighting
      
      console.log(`🍃 Successfully created instanced foliage with ${validClusters.length} clusters for ${species}`);
      return instancedMesh;
      
    } catch (error) {
      console.error('🚨 Error creating instanced foliage:', error);
      return null;
    }
  }

  private createFallbackFoliage(clusters: FoliageCluster[], species: TreeSpeciesType): THREE.Mesh[] {
    console.log(`🍃 Creating fallback foliage with ${clusters.length} individual meshes for ${species}`);
    
    const foliageMeshes: THREE.Mesh[] = [];
    const variantIndex = this.getSpeciesGeometryVariant(species);
    const baseGeometry = this.foliageGeometryCache.get(`foliage_lod0_v${variantIndex}`)!;
    const material = this.getRealisticFoliageMaterial(species);
    
    for (const cluster of clusters) {
      if (cluster.size <= 0) continue;
      
      // Create organic scaling based on species
      const asymmetricScale = this.getSpeciesAsymmetricScale(species, cluster.size);
      
      const mesh = new THREE.Mesh(baseGeometry.clone(), material.clone());
      mesh.position.copy(cluster.position);
      mesh.scale.copy(asymmetricScale);
      mesh.rotation.y = Math.random() * Math.PI * 2;
      
      mesh.castShadow = true;
      mesh.receiveShadow = true; // Re-enable shadow receiving for realistic lighting
      
      foliageMeshes.push(mesh);
    }
    
    return foliageMeshes;
  }

  private getSpeciesAsymmetricScale(species: TreeSpeciesType, baseSize: number): THREE.Vector3 {
    // Create species-specific scaling to break perfect spheres
    switch (species) {
      case TreeSpeciesType.OAK:
        // Broad, flattened canopy
        return new THREE.Vector3(
          baseSize * (1.1 + Math.random() * 0.3),
          baseSize * (0.8 + Math.random() * 0.2),
          baseSize * (1.0 + Math.random() * 0.3)
        );
      case TreeSpeciesType.WILLOW:
        // Drooping, asymmetric foliage
        return new THREE.Vector3(
          baseSize * (0.9 + Math.random() * 0.2),
          baseSize * (1.2 + Math.random() * 0.3),
          baseSize * (0.8 + Math.random() * 0.2)
        );
      case TreeSpeciesType.BIRCH:
        // Delicate, compact foliage
        return new THREE.Vector3(
          baseSize * (0.9 + Math.random() * 0.1),
          baseSize * (0.95 + Math.random() * 0.1),
          baseSize * (0.9 + Math.random() * 0.1)
        );
      case TreeSpeciesType.DEAD:
        // Irregular, sparse foliage
        return new THREE.Vector3(
          baseSize * (0.7 + Math.random() * 0.4),
          baseSize * (0.6 + Math.random() * 0.3),
          baseSize * (0.8 + Math.random() * 0.4)
        );
      default:
        return new THREE.Vector3(baseSize, baseSize, baseSize);
    }
  }

  private getSpeciesGeometryVariant(species: TreeSpeciesType): number {
    // Select geometry variant based on species characteristics
    switch (species) {
      case TreeSpeciesType.OAK:
        return 0; // Natural, slightly flattened
      case TreeSpeciesType.WILLOW:
        return 1; // Asymmetric, drooping
      case TreeSpeciesType.BIRCH:
        return 2; // Compact, dense
      case TreeSpeciesType.DEAD:
        return 3; // Irregular, natural variation
      default:
        return 0;
    }
  }

  private getRealisticFoliageMaterial(species: TreeSpeciesType): THREE.Material {
    const materialKey = `realistic_foliage_${species}`;
    
    if (!this.materialCache.has(materialKey)) {
      // Get natural colors per species
      const baseColor = this.getSpeciesNaturalColor(species);
      console.log(`🍃 Creating material for ${species} with base color:`, new THREE.Color(baseColor).getHexString());
      
      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.65, // Reduced roughness for better light reflection
        metalness: 0.0,
        transparent: false,
        side: THREE.FrontSide, // Single-sided for better performance and lighting
        vertexColors: false, // DISABLED - this was overriding the bright base colors!
        // No emissive - removed to eliminate glow
      });
      
      console.log(`🍃 Material created with vertexColors DISABLED for bright foliage`);
      
      // Store reference for day/night updates
      this.activeFoliageMaterials.add(material);
      this.materialCache.set(materialKey, material);
    }
    
    return this.materialCache.get(materialKey)!;
  }

  private getSpeciesNaturalColor(species: TreeSpeciesType): number {
    // Get color variants for species with natural variation
    const variants = this.getSpeciesColorVariants(species);
    return variants[Math.floor(Math.random() * variants.length)];
  }
  
  private getSpeciesColorVariants(species: TreeSpeciesType): number[] {
    // Multiple realistic color variants per species for natural variation
    switch (species) {
      case TreeSpeciesType.OAK:
        return [
          0x8BC34A, // Brighter natural green
          0x7CB342, // Medium forest green
          0x689F38, // Deeper green
          0x9CCC65  // Light natural green
        ];
      case TreeSpeciesType.BIRCH:
        return [
          0x7CB342, // Muted forest green (less bright)
          0x689F38, // Natural birch green
          0x8BC34A, // Slightly brighter variant
          0x66BB6A  // Soft green
        ];
      case TreeSpeciesType.WILLOW:
        return [
          0x9CCC65, // Soft yellow-green
          0x8BC34A, // Natural green
          0xAED581, // Light willow green
          0x7CB342  // Medium green
        ];
      case TreeSpeciesType.DEAD:
        return [
          0xA0522D, // Sienna - realistic dead foliage
          0x8D6E63, // Lighter brown
          0x795548, // Dark brown
          0x6D4C41  // Deep brown
        ];
      default:
        return [0x8BC34A]; // Default brighter green
    }
  }

  private getOptimizedFoliageMaterial(species: TreeSpeciesType): THREE.Material {
    // For backward compatibility - redirect to realistic material
    return this.getRealisticFoliageMaterial(species);
  }

  private createPineTreeStructure(treeHeight: number, trunkBaseRadius: number): {
    branches: THREE.Object3D[];
    foliageClusters: FoliageCluster[];
  } {
    const branches: THREE.Object3D[] = [];
    const foliageClusters: FoliageCluster[] = [];
    
    // Formula-based cone generation - create actual cone geometries
    const coneCount = Math.floor(treeHeight / 4) + 2; // Gives 4-8 cones for 15-25 unit trees
    const startHeight = treeHeight * 0.15; // Start at 15% of trunk height
    const endHeight = treeHeight * 0.95; // End at 95% of trunk height
    const coverageHeight = endHeight - startHeight;
    
    // Proper cone sizing with linear taper
    const bottomConeRadius = treeHeight * 0.3; // Bottom cone = 30% of height radius
    const topConeRadius = treeHeight * 0.05; // Top cone = 5% of height radius
    const coneGeometryHeight = treeHeight * 0.35; // Cone geometry height for overlap
    
    // Even vertical spacing with 50% overlap
    const verticalSpacing = coverageHeight / (coneCount - 1);
    
    console.log(`🌲 Creating pine tree with ${coneCount} cone geometries, height=${treeHeight.toFixed(2)}`);
    
    for (let i = 0; i < coneCount; i++) {
      const heightRatio = i / (coneCount - 1);
      
      // Linear taper from bottom to top
      const coneRadius = bottomConeRadius * (1 - heightRatio) + topConeRadius * heightRatio;
      
      // Even distribution with proper spacing
      const coneY = startHeight + (i * verticalSpacing);
      
      // Create actual cone geometry
      const coneGeometry = new THREE.ConeGeometry(coneRadius, coneGeometryHeight, 8);
      const coneMaterial = this.getOptimizedFoliageMaterial(TreeSpeciesType.PINE);
      const coneMesh = new THREE.Mesh(coneGeometry, coneMaterial);
      
      // Position cone properly
      coneMesh.position.set(0, coneY + (coneGeometryHeight / 2), 0);
      coneMesh.castShadow = true;
      coneMesh.receiveShadow = true; // Re-enable shadow receiving for realistic lighting
      
      // Add slight rotation for natural look
      coneMesh.rotation.y = Math.random() * Math.PI * 2;
      
      // Add cone mesh as a branch (since we return it in branches array)
      branches.push(coneMesh);
    }
    
    console.log(`🌲 Created pine tree with ${branches.length} cone geometries`);
    
    // No foliage clusters needed - we're using direct cone geometries
    // No branches needed - pine trees have cones directly attached to trunk
    
    return { branches, foliageClusters };
  }

  private createRealisticTrunk(species: TreeSpeciesType, height: number, baseRadius: number): THREE.Mesh {
    const segments = 16;
    const heightSegments = 12;
    
    const geometry = new THREE.CylinderGeometry(
      baseRadius * 0.3,
      baseRadius,
      height,
      segments,
      heightSegments
    );

    this.applyOrganicDeformation(geometry, species, height);
    const material = this.createAdvancedTrunkMaterial(species);

    const trunk = new THREE.Mesh(geometry, material);
    trunk.position.y = height / 2;
    trunk.castShadow = true;
    trunk.receiveShadow = true;

    return trunk;
  }

  private applyOrganicDeformation(geometry: THREE.BufferGeometry, species: TreeSpeciesType, height: number): void {
    const positions = geometry.attributes.position;
    
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      
      const heightFactor = (y + height / 2) / height;
      
      switch (species) {
        case TreeSpeciesType.OAK:
          const buttressEffect = Math.max(0, 1 - heightFactor * 3) * 0.3;
          const gnarlNoise = Math.sin(heightFactor * 8 + Math.atan2(z, x) * 3) * 0.1;
          positions.setX(i, x * (1 + buttressEffect + gnarlNoise));
          positions.setZ(i, z * (1 + buttressEffect + gnarlNoise));
          break;
          
        case TreeSpeciesType.BIRCH:
          const bendCurve = Math.sin(heightFactor * Math.PI) * 0.2;
          positions.setX(i, x + bendCurve);
          break;
          
        case TreeSpeciesType.WILLOW:
          const twist = heightFactor * Math.PI * 0.5;
          const newX = x * Math.cos(twist) - z * Math.sin(twist);
          const newZ = x * Math.sin(twist) + z * Math.cos(twist);
          positions.setX(i, newX);
          positions.setZ(i, newZ);
          break;
          
        case TreeSpeciesType.DEAD:
          const weathering = (Math.random() - 0.5) * 0.2 * heightFactor;
          positions.setX(i, x + weathering);
          positions.setZ(i, z + weathering);
          break;
      }
    }
    
    geometry.computeVertexNormals();
  }

  private createAdvancedTrunkMaterial(species: TreeSpeciesType): THREE.MeshStandardMaterial {
    const config = TreeSpeciesManager.getSpeciesConfig(species);
    const textureType = species === TreeSpeciesType.PINE ? 'pine' : config.textureType;
    const texture = this.textureCache.get(textureType);

    // Brighter trunk colors that respond better to lighting
    let trunkColor = config.trunkColor;
    
    // Brighten the trunk color by increasing lightness
    const color = new THREE.Color(trunkColor);
    const hsl = { h: 0, s: 0, l: 0 };
    color.getHSL(hsl);
    color.setHSL(hsl.h, hsl.s, Math.min(1.0, hsl.l * 1.4)); // Increase lightness by 40%

    return new THREE.MeshStandardMaterial({
      color: color,
      map: texture,
      roughness: 0.8, // Slightly less rough for better light reflection
      metalness: 0.0,
      bumpMap: texture,
      bumpScale: 0.2 // Reduced bump scale for more even lighting
    });
  }

  /**
   * Update foliage materials for day/night lighting
   */
  public updateDayNightLighting(dayFactor: number, nightFactor: number): void {
    console.log(`🍃 Day/Night update called - dayFactor: ${dayFactor}, nightFactor: ${nightFactor}`);
    
    // Update foliage materials
    for (const material of this.activeFoliageMaterials) {
      // Get the material's current color - NOT the original color which is being overwritten
      const currentColor = new THREE.Color(material.color);
      console.log(`🍃 Material current color:`, currentColor.getHexString());
      
      // Get the species from material cache to restore proper base color
      let baseColor = new THREE.Color(0x8BC34A); // Default bright green
      
      // Try to find the original species color from material cache key
      for (const [key, cachedMaterial] of this.materialCache.entries()) {
        if (cachedMaterial === material && key.includes('_')) {
          const species = key.split('_')[2] as TreeSpeciesType;
          const colorVariants = this.getSpeciesColorVariants(species);
          baseColor = new THREE.Color(colorVariants[0]); // Use first variant as base
          break;
        }
      }
      
      console.log(`🍃 Using base color:`, baseColor.getHexString());
      
      // Create night version - darker but still visible
      const nightColor = baseColor.clone().multiplyScalar(0.6); // Increased from 0.5 to keep more color
      
      // Blend between day and night colors
      const blendedColor = baseColor.clone().lerp(nightColor, nightFactor);
      material.color.copy(blendedColor);
      console.log(`🍃 Material updated color:`, blendedColor.getHexString());
      
      // Adjust material properties for lighting conditions
      const baseRoughness = 0.65;
      material.roughness = baseRoughness + (nightFactor * 0.1); // Slightly rougher at night
      
      // Remove emissive completely to prevent glow
      material.emissive.setRGB(0, 0, 0);
    }

    // Update trunk materials
    for (const material of this.activeTrunkMaterials) {
      const baseBarkColor = new THREE.Color(0xA0522D); // Brown bark color
      console.log(`🌳 Trunk material current color:`, material.color.getHexString());
      
      // Create night version - darker but still visible
      const nightColor = baseBarkColor.clone().multiplyScalar(0.4); // Darker at night
      
      // Blend between day and night colors
      const blendedColor = baseBarkColor.clone().lerp(nightColor, nightFactor);
      material.color.copy(blendedColor);
      console.log(`🌳 Trunk material updated color:`, blendedColor.getHexString());
      
      // Adjust material properties for lighting conditions
      const baseRoughness = 0.8;
      material.roughness = baseRoughness + (nightFactor * 0.1);
      
      // Remove emissive completely
      material.emissive.setRGB(0, 0, 0);
    }
  }
  
  /**
   * Get all active foliage materials for external updates
   */
  public getFoliageMaterials(): Set<THREE.MeshStandardMaterial> {
    return this.activeFoliageMaterials;
  }

  public dispose(): void {
    // Dispose textures
    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();
    
    // Dispose geometries
    for (const geometry of this.foliageGeometryCache.values()) {
      geometry.dispose();
    }
    this.foliageGeometryCache.clear();
    
    // Dispose materials
    for (const material of this.materialCache.values()) {
      material.dispose();
    }
    this.materialCache.clear();
    
    // Clear active materials sets
    this.activeFoliageMaterials.clear();
    this.activeTrunkMaterials.clear();
  }
}
