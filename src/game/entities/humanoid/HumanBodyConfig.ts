import * as THREE from 'three';
import { EnemyType } from '../../../types/GameTypes';
import { HumanoidConfig } from './EnemyHumanoid';

export class HumanBodyConfig {
  /**
   * Creates a realistic human body configuration
   * Humans are smaller, more refined than orcs
   * Realistic proportions with civilian appearance
   */
  public static createHumanConfig(): HumanoidConfig {
    return {
      type: EnemyType.GOBLIN, // Reuse goblin type for smaller build, but with human features
      health: 100,
      maxHealth: 100,
      speed: 1.5,
      damage: 0, // Peaceful NPC
      goldReward: 0,
      experienceReward: 0,
      attackRange: 0,
      damageRange: 0,
      attackCooldown: 0,
      points: 0,
      knockbackResistance: 0,
      
      // Realistic human body proportions - much smaller than orc, with shorter arms
      bodyScale: {
        body: { radius: 0.3, height: 1.0 },      // Smaller human torso
        head: { radius: 0.25 },                  // Smaller human head
        arm: { radius: [0.08, 0.1], length: 0.5 },       // Shorter human arms
        forearm: { radius: [0.06, 0.08], length: 0.42 }, // Shorter human forearms
        leg: { radius: [0.1, 0.12], length: 0.6 },       // Human thighs
        shin: { radius: [0.08, 0.1], length: 0.55 }      // Human calves
      },
      
      // Realistic human skin tones and clothing colors
      colors: {
        skin: 0xFFDBAE,    // Natural human skin tone
        muscle: 0xE6C2A6,  // Slightly darker muscle definition
        accent: 0xD4AF8C   // Accent for joints and details
      },
      
      // Human facial features - no tusks, normal eyes
      features: {
        hasEyes: true,
        hasTusks: false,   // Humans don't have tusks
        hasWeapon: false,  // Peaceful NPC doesn't carry weapons
        eyeConfig: {
          radius: 0.08,
          color: 0xFFFFFF,        // White human eyes
          emissiveIntensity: 0.0,  // No glow for human eyes
          offsetX: 0.12,
          offsetY: 0.05,
          offsetZ: 0.9
        }
      }
    };
  }

  /**
   * Creates configuration for a tavern keeper with natural skin tones
   */
  public static createTavernKeeperConfig(): HumanoidConfig {
    const baseConfig = this.createHumanConfig();
    
    return {
      ...baseConfig,
      // Use natural skin tones instead of clothing colors
      colors: {
        skin: 0xFFDBAE,    // Human skin tone
        muscle: 0xE6C2A6,  // Slightly darker muscle definition (skin tone)
        accent: 0xD4AF8C   // Accent for joints and details (skin tone)
      }
    };
  }

  /**
   * Creates hair geometry for human NPCs
   */
  public static createHumanHair(headRadius: number, hairColor: number = 0x8B4513): THREE.Mesh {
    // Create natural-looking human hair cap
    const hairGeometry = new THREE.SphereGeometry(headRadius * 1.08, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.65);
    
    // Modify geometry for more natural hair shape
    const positions = hairGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Add slight randomness for natural hair texture
      const normalizedY = (y / (headRadius * 1.08)) + 0.5;
      const hairThickness = 1.0 + (Math.random() - 0.5) * 0.1;
      
      positions[i] = x * hairThickness;
      positions[i + 2] = z * hairThickness;
    }
    
    hairGeometry.attributes.position.needsUpdate = true;
    hairGeometry.computeVertexNormals();
    
    const hairMaterial = new THREE.MeshPhongMaterial({
      color: hairColor,
      shininess: 35,
      specular: 0x333333
    });
    
    return new THREE.Mesh(hairGeometry, hairMaterial);
  }

  /**
   * Creates form-fitting t-shirt that matches exact body contours
   */
  public static createTShirt(bodyRadius: number, bodyHeight: number, tshirtColor: number = 0x4169E1): THREE.Group {
    const tshirtGroup = new THREE.Group();
    
    // Use exact body measurements for perfect fit (from createHumanConfig)
    const armRadius = 0.1; // bodyScale.arm.radius[1] from config
    const armLength = 0.5; // bodyScale.arm.length from config  
    const armPositionX = bodyRadius * 0.85; // Exact arm attachment position
    
    // Create fabric material with realistic properties
    const shirtMaterial = new THREE.MeshPhongMaterial({
      color: tshirtColor,
      shininess: 5,         // Low shininess for fabric
      specular: 0x111111,   // Minimal specular for cotton-like appearance
      transparent: false
    });
    
    // 1. Main torso section - matches the exact body shape from EnemyHumanoid.ts but slightly larger
    const torsoGeometry = new THREE.CylinderGeometry(
      bodyRadius * 1.1 * 1.05,  // Chest width - match body exactly (1.1) + 5% fabric allowance
      bodyRadius * 0.7 * 1.05,  // Waist width - match body exactly (0.7) + 5% fabric allowance  
      bodyHeight * 1.2 * 0.8,   // Height - match body (1.2) but cover 80% for t-shirt length
      32, 16                    // Same high resolution as body for smooth curves
    );
    
    // Apply the same anatomical shaping as the actual torso (from EnemyHumanoid.ts)
    const positions = torsoGeometry.attributes.position.array as Float32Array;
    const isHuman = true; // This is for human NPCs
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Normalize Y position (-0.5 to 0.5) - same logic as body creation
      const normalizedY = y / (bodyHeight * 1.2);
      
      // Apply the exact same scaling logic as the actual torso
      let scaleFactor = 1.0;
      
      if (normalizedY > 0.3) {
        // Upper chest/shoulder area - wider
        scaleFactor = 1.0 + (normalizedY - 0.3) * 0.4;
      } else if (normalizedY > 0.0) {
        // Mid torso - gradual narrowing
        scaleFactor = 1.0 + normalizedY * 0.1;
      } else if (normalizedY > -0.3) {
        // Lower torso/waist - narrower
        scaleFactor = 1.0 - Math.abs(normalizedY) * 0.2;
      } else {
        // Hip area - slightly wider again
        scaleFactor = 0.85 + Math.abs(normalizedY + 0.3) * 0.1;
      }
      
      // Human shoulder curve enhancement (from original body code)
      if (isHuman && normalizedY > 0.1) {
        const shoulderCurve = Math.sin((normalizedY - 0.1) * Math.PI * 2.5);
        const shoulderWidth = 1.0 + shoulderCurve * 0.15;
        
        const distance = Math.sqrt(x * x + z * z);
        if (distance > 0) {
          const normalizedX = x / distance;
          const normalizedZ = z / distance;
          
          const newDistance = distance * shoulderWidth * 1.05; // +5% fabric allowance
          positions[i] = normalizedX * newDistance;
          positions[i + 2] = normalizedZ * newDistance;
        }
      } else {
        // Apply the scaling with fabric allowance (5% larger than body)
        positions[i] = x * scaleFactor * 1.05;
        positions[i + 2] = z * scaleFactor * 1.05;
      }
    }
    
    torsoGeometry.attributes.position.needsUpdate = true;
    torsoGeometry.computeVertexNormals();
    
    const torso = new THREE.Mesh(torsoGeometry, shirtMaterial);
    torso.castShadow = true;
    torso.receiveShadow = true;
    torso.position.set(0, 0, 0);
    
    // 2. Shoulder connection pieces - smooth transition from torso to sleeves
    const shoulderGeometry = new THREE.SphereGeometry(
      bodyRadius * 0.25,    // Shoulder padding size 
      12, 8,                // Segments
      0, Math.PI,           // Hemisphere
      0, Math.PI * 0.7      // Partial sphere for shoulder shape
    );
    
    // Left shoulder
    const leftShoulder = new THREE.Mesh(shoulderGeometry, shirtMaterial.clone());
    leftShoulder.position.set(-armPositionX, bodyHeight * 0.35, 0);
    leftShoulder.rotation.z = Math.PI * 0.15; // Slight rotation for natural fit
    leftShoulder.castShadow = true;
    
    // Right shoulder  
    const rightShoulder = new THREE.Mesh(shoulderGeometry, shirtMaterial.clone());
    rightShoulder.position.set(armPositionX, bodyHeight * 0.35, 0);
    rightShoulder.rotation.z = -Math.PI * 0.15; // Mirror rotation
    rightShoulder.castShadow = true;
    
    // 3. Sleeves - positioned exactly at arm attachment points with correct dimensions
    const sleeveRadius = armRadius * 1.15; // 15% larger than arm for fabric fit
    const sleeveLength = armLength * 0.6;  // Cover upper arm partially
    
    const sleeveGeometry = new THREE.CylinderGeometry(
      sleeveRadius,         // Top radius (matches arm + fabric allowance)
      sleeveRadius * 0.9,   // Bottom radius (slightly tapered)
      sleeveLength,         // Length based on arm measurements
      12, 4                 // Segments
    );
    
    // Left sleeve - positioned at exact arm location
    const leftSleeve = new THREE.Mesh(sleeveGeometry, shirtMaterial.clone());
    leftSleeve.position.set(
      -armPositionX,                    // Exact arm X position
      bodyHeight * 0.35 - sleeveLength * 0.3, // Slightly below shoulder
      0
    );
    leftSleeve.rotation.z = Math.PI * 0.08; // Slight outward angle
    leftSleeve.castShadow = true;
    
    // Right sleeve - positioned at exact arm location
    const rightSleeve = new THREE.Mesh(sleeveGeometry, shirtMaterial.clone());
    rightSleeve.position.set(
      armPositionX,                     // Exact arm X position  
      bodyHeight * 0.35 - sleeveLength * 0.3, // Slightly below shoulder
      0
    );
    rightSleeve.rotation.z = -Math.PI * 0.08; // Mirror angle
    rightSleeve.castShadow = true;
    
    // 4. Neck opening - realistic collar
    const neckGeometry = new THREE.TorusGeometry(
      bodyRadius * 0.4,     // Neck opening radius
      bodyRadius * 0.04,    // Collar thickness  
      8, 16
    );
    
    const neckCollar = new THREE.Mesh(neckGeometry, shirtMaterial.clone());
    neckCollar.position.set(0, bodyHeight * 0.38, 0);
    neckCollar.rotation.x = Math.PI / 2;
    neckCollar.castShadow = true;
    
    // Assemble complete form-fitting t-shirt
    tshirtGroup.add(torso);
    tshirtGroup.add(leftShoulder);
    tshirtGroup.add(rightShoulder);
    tshirtGroup.add(leftSleeve);
    tshirtGroup.add(rightSleeve);
    tshirtGroup.add(neckCollar);
    
    return tshirtGroup;
  }

  /**
   * Creates clothing overlay for human NPCs (legacy method)
   */
  public static createClothing(bodyRadius: number, bodyHeight: number, clothingColor: number = 0x8B4513): THREE.Mesh {
    // Create simple tunic/apron overlay
    const clothingGeometry = new THREE.CylinderGeometry(
      bodyRadius * 1.15, 
      bodyRadius * 1.1, 
      bodyHeight * 0.8, 
      16, 4
    );
    
    const clothingMaterial = new THREE.MeshPhongMaterial({
      color: clothingColor,
      shininess: 10,
      specular: 0x222222
    });
    
    return new THREE.Mesh(clothingGeometry, clothingMaterial);
  }
}
