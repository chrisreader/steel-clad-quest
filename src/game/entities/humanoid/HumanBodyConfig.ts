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
    
    // 1. Main torso section - matches the EXACT body shape from EnemyHumanoid.ts but slightly larger
    const torsoGeometry = new THREE.CylinderGeometry(
      bodyRadius * 1.1,     // Chest width - match body exactly
      bodyRadius * 0.7,     // Waist width - match body exactly  
      bodyHeight * 1.2,     // Height - match body exactly (full height for neck tapering)
      32, 16                // Same high resolution as body for smooth curves
    );
    
    // Apply the EXACT same anatomical shaping as the actual torso (from EnemyHumanoid.ts)
    const positions = torsoGeometry.attributes.position.array as Float32Array;
    const isHuman = true; // This is for human NPCs
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];
      
      // Normalize Y position (-0.5 to 0.5) - same logic as body creation
      const normalizedY = y / bodyHeight;
      
      let scaleFactor = 1.0;
      let frontBackScale = 1.0;
      
      // EXACT same logic as EnemyHumanoid.ts for humans - create graduated scaling for natural shoulder-to-neck transition
      if (isHuman && normalizedY > 0.1) {
        if (normalizedY > 0.45) {
          // Very top - significant taper toward neck (CRITICAL for neck fit)
          const topCurve = (normalizedY - 0.45) / 0.05; // 0 at upper-top boundary, 1 at very top
          scaleFactor = 1.2 - (topCurve * 0.4); // Taper from 1.2 to 0.8
          frontBackScale = 1.0 - topCurve * 0.3; // More narrow front-to-back
        } else if (normalizedY > 0.4) {
          // Upper-top - start slight taper (extended chest area)
          const upperCurve = (normalizedY - 0.4) / 0.05; // 0 at upper-middle boundary, 1 at very top boundary
          scaleFactor = 1.2 - (upperCurve * 0.1); // Gradual reduction from 1.2 to 1.1
          frontBackScale = 1.0 - upperCurve * 0.15; // Start front-to-back compression
        } else {
          // Upper-middle - broader chest/shoulder area (EXTENDED higher to align with shoulders)
          scaleFactor = 1.2; // Broader chest extending higher
          frontBackScale = 1.0; // Flatter chest front-to-back depth
        }
        
        // Create curved shoulder transition for all upper sections (EXACT same as body)
        const shoulderRadius = Math.sqrt(x * x + z * z);
        if (shoulderRadius > 0) {
          const angle = Math.atan2(z, x);
          const ovalX = Math.cos(angle) * shoulderRadius * scaleFactor;
          
          // Apply different scaling to front vs back - make back flatter
          let zScale = frontBackScale;
          if (z < 0) { // Back of the chest (negative Z)
            zScale = frontBackScale * 0.85; // Make back slightly flatter
          }
          
          const ovalZ = Math.sin(angle) * shoulderRadius * zScale;
          
          // Add 5% fabric allowance to the final shape
          positions[i] = ovalX * 1.05;
          positions[i + 2] = ovalZ * 1.05;
        }
      }
      // Regular chest area - keep full width
      else if (normalizedY > 0.1) {
        scaleFactor = 1.0; // Keep full width at chest
        positions[i] = x * scaleFactor * 1.05;
        positions[i + 2] = z * scaleFactor * 1.05;
      }
      // Waist area - narrower 
      else if (normalizedY >= -0.2) {
        // Smooth transition to narrow waist
        const waistPosition = (normalizedY + 0.2) / 0.3; // 0 at bottom of waist, 1 at top
        scaleFactor = 0.75 + waistPosition * 0.25; // Scale from 0.75 to 1.0
        positions[i] = x * scaleFactor * 1.05;
        positions[i + 2] = z * scaleFactor * 1.05;
      }
      // Hip/pelvis area - wider again
      else {
        // Smooth transition to wider hips
        const hipPosition = Math.abs(normalizedY + 0.2) / 0.3; // 0 at waist, 1 at bottom
        scaleFactor = 0.75 + hipPosition * 0.2; // Scale from 0.75 to 0.95
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
    
    // 2. Shoulder deltoid pieces - match EXACT deltoid geometry from EnemyHumanoid.ts
    const shoulderJointRadius = (bodyRadius * 0.5) * 1.08; // Match body deltoid size + 8% fabric allowance
    
    // Create custom deltoid-shaped shoulder geometry - IDENTICAL to body creation
    const shoulderGeometry = new THREE.SphereGeometry(shoulderJointRadius, 24, 16);
    
    // Apply the EXACT same deltoid vertex manipulation as the actual shoulder joints
    const shoulderPositions = shoulderGeometry.attributes.position.array as Float32Array;
    for (let i = 0; i < shoulderPositions.length; i += 3) {
      const x = shoulderPositions[i];
      const y = shoulderPositions[i + 1];
      const z = shoulderPositions[i + 2];
      
      // Calculate normalized position within sphere (EXACT same logic)
      const distance = Math.sqrt(x * x + y * y + z * z);
      const normalizedY = y / shoulderJointRadius; // -1 to 1, where 1 is top, -1 is bottom
      
      // Convert to normalized coordinates (EXACT same)
      const heightNorm = (normalizedY + 1.0) / 2.0; // 0 at bottom, 1 at top
      
      // Completely uniform scaling around circumference (EXACT same)
      let scaleFactor = 0.75 + (heightNorm * 0.1); // Simple linear from 0.75 to 0.85
      
      // Constant front-back compression throughout (EXACT same)
      let frontBackScale = 0.68;
      
      // Apply scaling with natural deltoid curves (EXACT same)
      const horizontalDistance = Math.sqrt(x * x + z * z);
      if (horizontalDistance > 0) {
        const angle = Math.atan2(z, x);
        
        // Apply lateral scaling to X (side-to-side) and front-back scaling to Z
        const newX = Math.cos(angle) * horizontalDistance * scaleFactor;
        const newZ = Math.sin(angle) * horizontalDistance * frontBackScale;
        
        shoulderPositions[i] = newX; // X scaling with lateral constraint
        shoulderPositions[i + 2] = newZ; // Z scaling with front-back compression
      }
    }
    shoulderGeometry.attributes.position.needsUpdate = true;
    shoulderGeometry.computeVertexNormals();
    
    // Left shoulder deltoid - positioned at EXACT arm location
    const leftShoulder = new THREE.Mesh(shoulderGeometry, shirtMaterial.clone());
    leftShoulder.position.set(
      -armPositionX,           // Exact arm X position
      bodyHeight * 0.35 + 0.05, // Match shoulder joint Y position (relative to arm + offset)
      0
    );
    leftShoulder.rotation.set(-0.393 + Math.PI, 0, -0.3); // Match arm rotation + deltoid flip
    leftShoulder.castShadow = true;
    
    // Right shoulder deltoid - positioned at EXACT arm location  
    const rightShoulder = new THREE.Mesh(shoulderGeometry.clone(), shirtMaterial.clone());
    rightShoulder.position.set(
      armPositionX,            // Exact arm X position
      bodyHeight * 0.35 + 0.05, // Match shoulder joint Y position
      0
    );
    rightShoulder.rotation.set(-0.393 + Math.PI, 0, 0.3); // Match arm rotation + deltoid flip
    rightShoulder.castShadow = true;
    
    // 3. Sleeves - match EXACT tapered arm geometry from EnemyHumanoid.ts
    const armTopRadius = armRadius; // 0.1 (bodyScale.arm.radius[1])
    const armBottomRadius = 0.08;   // bodyScale.arm.radius[0] 
    const sleeveLength = armLength * 0.6; // Cover 60% of upper arm
    
    // Create tapered sleeve geometry - IDENTICAL to createTaperedLimbGeometry
    const sleeveGeometry = new THREE.CylinderGeometry(
      armTopRadius * 1.1,      // Top radius with 10% fabric allowance
      armBottomRadius * 1.1,   // Bottom radius with 10% fabric allowance  
      sleeveLength,            // Length based on arm measurements
      24, 8                    // Same high resolution as arms
    );
    
    // Left sleeve - positioned at EXACT arm location with EXACT arm rotation
    const leftSleeve = new THREE.Mesh(sleeveGeometry, shirtMaterial.clone());
    leftSleeve.position.set(
      -armPositionX,                    // Exact arm X position (-0.255)
      bodyHeight * 0.35 - sleeveLength * 0.3, // Positioned relative to shoulder height
      0
    );
    leftSleeve.rotation.set(-0.393, 0, -0.3); // EXACT same rotation as actual arm
    leftSleeve.castShadow = true;
    
    // Right sleeve - positioned at EXACT arm location with EXACT arm rotation
    const rightSleeve = new THREE.Mesh(sleeveGeometry.clone(), shirtMaterial.clone());
    rightSleeve.position.set(
      armPositionX,                     // Exact arm X position (0.255)  
      bodyHeight * 0.35 - sleeveLength * 0.3, // Positioned relative to shoulder height
      0
    );
    rightSleeve.rotation.set(-0.393, 0, 0.3); // EXACT same rotation as actual arm
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
