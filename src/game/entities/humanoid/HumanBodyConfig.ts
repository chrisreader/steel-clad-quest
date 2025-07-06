import * as THREE from 'three';
import { EnemyType } from '../../../types/GameTypes';
import { HumanoidConfig } from './EnemyHumanoid';
import { HumanMaterialManager } from './HumanMaterialManager';

export class HumanBodyConfig {
  /**
   * Creates a realistic human body configuration
   * Humans are smaller, more refined than orcs
   * Realistic proportions with civilian appearance
   */
  public static createHumanConfig(): HumanoidConfig {
    return {
      type: EnemyType.HUMAN, // Use proper human type
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
        hasWeapon: false,  // Peaceful NPC doesn't carry weapons by default
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
   * Creates randomized human configuration with varied clothing and hair
   */
  public static createRandomizedHumanConfig(): HumanoidConfig {
    const baseConfig = this.createHumanConfig();
    
    // Randomize t-shirt colors
    const tshirtColors = [0x808080, 0x2F4F2F, 0xF5F5DC, 0x4169E1, 0x8B0000]; // grey, dark green, cream, blue, red
    const tshirtColor = tshirtColors[Math.floor(Math.random() * tshirtColors.length)];
    
    // Randomize pants colors
    const pantsColors = [0x000000, 0x2F4F2F, 0x808080, 0x8B4513, 0x483D8B]; // black, dark green, grey, brown, blue
    const pantsColor = pantsColors[Math.floor(Math.random() * pantsColors.length)];
    
    // Randomize hair colors
    const hairColors = [0x000000, 0x8B4513, 0x808080, 0x654321, 0x2F1B14]; // black, brown, grey, dark brown, very dark brown
    const hairColor = hairColors[Math.floor(Math.random() * hairColors.length)];
    
    return {
      ...baseConfig,
      // Keep proper human skin tones for skin/muscle/accent - these are used for body rendering
      colors: {
        skin: 0xFFDBAE,    // Always human skin tone
        muscle: 0xE6C2A6,  // Always human muscle tone
        accent: 0xD4AF8C   // Always human accent tone
      },
      // Store clothing and hair colors in userData for clothing creation
      userData: {
        clothingColors: {
          tshirt: tshirtColor,
          pants: pantsColor,
          hair: hairColor
        },
        toolType: 'dagger' // Default tool type for camp NPCs
      },
      features: {
        ...baseConfig.features,
        hasWeapon: true // Camp NPCs carry tools/weapons
      }
    };
  }

  /**
   * Creates hair geometry for human NPCs
   */
  public static createHumanHair(headRadius: number, hairColor: number): THREE.Mesh {
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
    const shirtMaterial = HumanMaterialManager.createClothingMaterial(tshirtColor, 'shirt');
    
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
    
    // Calculate positions RELATIVE TO BODY since t-shirt will be added as child to body mesh
    // From EnemyHumanoid: shoulderHeight = bodyTopY - 0.15, arms are at shoulderHeight in world coords
    // Body is positioned at bodyY in world coords, so relative to body: shoulderHeight - bodyY
    const legLength = 0.6; // bodyScale.leg.length from human config
    const shinLength = 0.55; // bodyScale.shin.length from human config  
    const footHeight = 0.2; // estimated foot height
    const groundToFeetBottom = legLength + shinLength + footHeight / 2;
    const legTopY = groundToFeetBottom;
    const bodyY = legTopY + bodyHeight / 2;
    const bodyTopY = bodyY + bodyHeight / 2;
    const shoulderHeightWorld = bodyTopY - 0.15; // World position
    const shoulderHeightRelative = shoulderHeightWorld - bodyY; // Relative to body center
    const exactArmPositionX = bodyRadius * 0.85; // EXACT same as arms: ±(bodyScale.body.radius * 0.85)
    
    // 2. T-shirt arm components using exact same methodology as pants
    // These will be stored in userData and attached to arm meshes for animation following
    
    const armTopRadius = armRadius; // 0.1 (bodyScale.arm.radius[1] from config)
    const armBottomRadius = 0.08;   // bodyScale.arm.radius[0] from config
    const halfSleeveLength = armLength * 0.5; // Cover half of upper arm length
    
    // Create shoulder deltoid components - EXACT same size as actual shoulder joints + fabric allowance
    const shoulderJointRadius = (bodyRadius * 0.5) * 1.15; // Same as actual shoulder deltoids + 15% fabric allowance
    
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
    
    // Create shoulder deltoid meshes - positioned relative to arm meshes they'll attach to
    const leftShoulderTShirt = new THREE.Mesh(shoulderGeometry, shirtMaterial.clone());
    leftShoulderTShirt.position.set(0, 0.05, 0); // Same relative position as actual shoulder joints
    leftShoulderTShirt.rotation.set(-0.393 + Math.PI, 0, -0.3); // EXACT shoulder joint rotation
    leftShoulderTShirt.castShadow = true;
    
    const rightShoulderTShirt = new THREE.Mesh(shoulderGeometry.clone(), shirtMaterial.clone());
    rightShoulderTShirt.position.set(0, 0.05, 0); // Same relative position as actual shoulder joints
    rightShoulderTShirt.rotation.set(-0.393 + Math.PI, 0, 0.3); // EXACT shoulder joint rotation
    rightShoulderTShirt.castShadow = true;
    
    // 3. Half-sleeve components - EXACT same size as arms but with fabric allowance
    const sleeveGeometry = new THREE.CylinderGeometry(
      armTopRadius * 1.15,    // Top radius with 15% fabric allowance
      armBottomRadius * 1.15, // Bottom radius with 15% fabric allowance  
      halfSleeveLength,       // Half the arm length for short sleeves
      24, 8                   // Same high resolution as actual arms
    );
    
    // Apply EXACT same geometry translation as actual arms: translate(0, -halfSleeveLength * 0.5, 0)
    sleeveGeometry.translate(0, -halfSleeveLength * 0.5, 0);
    
    const leftSleeveTShirt = new THREE.Mesh(sleeveGeometry, shirtMaterial.clone());
    leftSleeveTShirt.position.set(0, 0, 0); // Positioned relative to leftArm mesh it will attach to
    leftSleeveTShirt.castShadow = true;
    leftSleeveTShirt.receiveShadow = true;
    
    const rightSleeveTShirt = new THREE.Mesh(sleeveGeometry.clone(), shirtMaterial.clone());
    rightSleeveTShirt.position.set(0, 0, 0); // Positioned relative to rightArm mesh it will attach to
    rightSleeveTShirt.castShadow = true;
    rightSleeveTShirt.receiveShadow = true;
    
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
    
    // Assemble main t-shirt (only torso and collar in main group)
    tshirtGroup.add(torso);
    tshirtGroup.add(neckCollar);
    
    // Store arm components in userData for attachment to arm meshes (same pattern as pants)
    // These won't be added to tshirtGroup as they attach directly to arm parts for animation following
    tshirtGroup.userData = {
      leftShoulderTShirt,
      rightShoulderTShirt,
      leftSleeveTShirt,
      rightSleeveTShirt
    };
    
    return tshirtGroup;
  }

  /**
   * Creates form-fitting pants that match exact leg contours and follow leg animations
   * Uses exact same methodology as createTShirt but for legs
   */
  public static createPants(bodyRadius: number, pantsColor: number = 0x2F4F2F): THREE.Group {
    const pantsGroup = new THREE.Group();
    
    // Use exact measurements from createHumanConfig for perfect fit
    const legTopRadius = 0.12;    // bodyScale.leg.radius[1] from config
    const legBottomRadius = 0.1;  // bodyScale.leg.radius[0] from config  
    const legLength = 0.6;        // bodyScale.leg.length from config
    const shinTopRadius = 0.1;    // bodyScale.shin.radius[1] from config
    const shinBottomRadius = 0.08; // bodyScale.shin.radius[0] from config
    const shinLength = 0.55;      // bodyScale.shin.length from config
    
    // Create fabric material with realistic properties (same as t-shirt)
    const pantsMaterial = HumanMaterialManager.createClothingMaterial(pantsColor, 'pants');
    
    // 1. Upper leg (thigh) pants sections - EXACT same size as legs but with fabric allowance
    const thighGeometry = new THREE.CylinderGeometry(
      legTopRadius * 1.15,    // Top radius with 15% fabric allowance to overlay on skin
      legBottomRadius * 1.15, // Bottom radius with 15% fabric allowance
      legLength,              // Exact same length as actual thigh
      24, 8                   // Same high resolution as actual legs for smooth curves
    );
    
    // Apply EXACT same geometry translation as actual legs
    // (No translation needed for thighs as they're positioned at center)
    
    const leftThighPants = new THREE.Mesh(thighGeometry, pantsMaterial.clone());
    leftThighPants.position.set(0, 0, 0); // Positioned relative to leftLeg mesh it will attach to
    leftThighPants.castShadow = true;
    leftThighPants.receiveShadow = true;
    
    const rightThighPants = new THREE.Mesh(thighGeometry.clone(), pantsMaterial.clone());
    rightThighPants.position.set(0, 0, 0); // Positioned relative to rightLeg mesh it will attach to
    rightThighPants.castShadow = true;
    rightThighPants.receiveShadow = true;
    
    // 2. Lower leg (shin) pants sections - EXACT same size as shins but with fabric allowance
    const shinGeometry = new THREE.CylinderGeometry(
      shinTopRadius * 1.15,    // Top radius with 15% fabric allowance
      shinBottomRadius * 1.15, // Bottom radius with 15% fabric allowance  
      shinLength,              // Exact same length as actual shin
      24, 8                    // Same high resolution as actual shins
    );
    
    // Apply EXACT same geometry translation as actual shins: translate(0, -shinLength * 0.5, 0)
    shinGeometry.translate(0, -shinLength * 0.5, 0);
    
    const leftShinPants = new THREE.Mesh(shinGeometry, pantsMaterial.clone());
    leftShinPants.position.set(0, 0, 0); // Positioned relative to leftKnee mesh it will attach to
    leftShinPants.castShadow = true;
    leftShinPants.receiveShadow = true;
    
    const rightShinPants = new THREE.Mesh(shinGeometry.clone(), pantsMaterial.clone());
    rightShinPants.position.set(0, 0, 0); // Positioned relative to rightKnee mesh it will attach to
    rightShinPants.castShadow = true;
    rightShinPants.receiveShadow = true;
    
    // 3. Knee fabric overlays - match the exact knee joint dimensions from EnemyHumanoid
    const kneeJointRadius = (legTopRadius + 0.02) * 1.15; // Same as actual knee joints + fabric allowance
    const kneeGeometry = new THREE.SphereGeometry(kneeJointRadius, 24, 20);
    
    // Apply same scaling as actual knee joints: scale.set(0.8, 1.2, 0.8)
    const leftKneePants = new THREE.Mesh(kneeGeometry, pantsMaterial.clone());
    leftKneePants.position.set(0, 0.03, 0); // Same relative position as actual knee joints
    leftKneePants.scale.set(0.8, 1.2, 0.8); // Same scaling as actual knee joints
    leftKneePants.castShadow = true;
    
    const rightKneePants = new THREE.Mesh(kneeGeometry.clone(), pantsMaterial.clone());
    rightKneePants.position.set(0, 0.03, 0); // Same relative position as actual knee joints
    rightKneePants.scale.set(0.8, 1.2, 0.8); // Same scaling as actual knee joints
    rightKneePants.castShadow = true;
    
    // 4. Waistband - positioned at hip level
    const waistbandGeometry = new THREE.TorusGeometry(
      bodyRadius * 0.5,      // Waistband radius larger than body radius at hip level
      bodyRadius * 0.08,     // Waistband thickness - slightly thicker
      8, 16
    );
    
    const waistband = new THREE.Mesh(waistbandGeometry, pantsMaterial.clone());
    waistband.position.set(0, 0, 0); // Will be positioned relative to main body when attached
    waistband.rotation.x = Math.PI / 2; // Horizontal orientation
    waistband.castShadow = true;
    
    // Store components in the group for easy access during attachment
    // Note: These won't be added to pantsGroup as they attach directly to body parts
    pantsGroup.userData = {
      leftThighPants,
      rightThighPants,
      leftShinPants,
      rightShinPants,
      leftKneePants,
      rightKneePants,
      waistband
    };
    
    return pantsGroup;
  }

}
