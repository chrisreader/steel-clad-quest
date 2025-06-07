
import * as THREE from 'three';

export const FlameShader = {
  vertexShader: `
    uniform float uTime;
    uniform float uIntensity;
    uniform float uWindStrength;
    
    varying vec2 vUv;
    varying float vHeight;
    varying vec3 vWorldPosition;
    
    void main() {
      vUv = uv;
      
      vec3 pos = position;
      vHeight = pos.y;
      
      // Multiple frequency wind simulation (like grass)
      float windEffect1 = sin(uTime * 2.0 + pos.x * 3.0) * 0.3;
      float windEffect2 = sin(uTime * 3.5 + pos.z * 2.0) * 0.2;
      float windEffect3 = sin(uTime * 5.0 + pos.x * 4.0) * 0.1;
      
      // Height-based motion scaling (tips move more)
      float heightFactor = pow(vHeight / 1.0, 1.5);
      
      // Apply organic dancing motion
      pos.x += (windEffect1 + windEffect2 + windEffect3) * heightFactor * uWindStrength * uIntensity;
      pos.z += (cos(uTime * 2.5 + pos.x * 2.0) * 0.2) * heightFactor * uWindStrength * uIntensity;
      
      // Flickering height variation
      pos.y += sin(uTime * 8.0 + pos.x * 5.0) * 0.1 * heightFactor * uIntensity;
      
      vWorldPosition = (modelMatrix * vec4(pos, 1.0)).xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `,
  
  fragmentShader: `
    uniform float uTime;
    uniform float uIntensity;
    uniform vec3 uBaseColor;
    uniform vec3 uTipColor;
    
    varying vec2 vUv;
    varying float vHeight;
    varying vec3 vWorldPosition;
    
    void main() {
      vec2 uv = vUv;
      
      // Create organic flame texture using noise
      float noise1 = sin(uv.y * 8.0 + uTime * 6.0) * 0.5 + 0.5;
      float noise2 = sin(uv.x * 12.0 + uTime * 4.0) * 0.3 + 0.7;
      float noise3 = sin((uv.x + uv.y) * 10.0 + uTime * 8.0) * 0.2 + 0.8;
      
      float flamePattern = noise1 * noise2 * noise3;
      
      // Height-based color gradient (base yellow/orange to tip red)
      vec3 color = mix(uBaseColor, uTipColor, uv.y);
      
      // Add flickering intensity
      float flicker = sin(uTime * 15.0 + vHeight * 20.0) * 0.1 + 0.9;
      color *= flicker;
      
      // Alpha based on flame pattern and height
      float alpha = flamePattern * (1.0 - uv.y * 0.7) * uIntensity;
      
      // Add edge softening
      float edgeSoftness = 1.0 - abs(uv.x - 0.5) * 2.0;
      alpha *= smoothstep(0.0, 0.3, edgeSoftness);
      
      gl_FragColor = vec4(color, alpha);
    }
  `
};

export function createFlameMaterial(baseColor: THREE.Color, tipColor: THREE.Color): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uIntensity: { value: 1.0 },
      uWindStrength: { value: 1.0 },
      uBaseColor: { value: baseColor },
      uTipColor: { value: tipColor }
    },
    vertexShader: FlameShader.vertexShader,
    fragmentShader: FlameShader.fragmentShader,
    transparent: true,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
}
