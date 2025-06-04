
export const FOG_VERTEX_SHADER = `
  varying vec3 vWorldPosition;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vDistance;
  
  uniform vec3 playerPosition;
  
  void main() {
    vPosition = position;
    vUv = uv;
    
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vDistance = distance(worldPosition.xyz, playerPosition);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const FOG_WALL_VERTEX_SHADER = `
  varying vec3 vWorldPosition;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vDistance;
  varying float vHeightFactor;
  varying vec3 vLocalPosition;
  
  uniform vec3 playerPosition;
  uniform float fogWallHeight;
  uniform float time;
  
  void main() {
    vPosition = position;
    vUv = uv;
    vLocalPosition = position;
    
    // Add organic vertex displacement
    vec3 displacedPosition = position;
    float noiseScale = 0.02;
    float displacement = sin(position.x * noiseScale + time * 0.5) * 
                        cos(position.z * noiseScale + time * 0.3) * 
                        sin(position.y * noiseScale * 2.0 + time * 0.2);
    
    // Apply displacement mainly to edges
    float edgeFactor = smoothstep(0.3, 1.0, abs(uv.x - 0.5) * 2.0);
    displacedPosition += normal * displacement * 2.0 * edgeFactor;
    
    vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
    vWorldPosition = worldPosition.xyz;
    vDistance = distance(worldPosition.xyz, playerPosition);
    
    // Calculate height factor for vertical fog wall gradient
    vHeightFactor = clamp(worldPosition.y / fogWallHeight, 0.0, 1.0);
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displacedPosition, 1.0);
  }
`;

export const ATMOSPHERIC_VERTEX_SHADER = `
  varying vec3 vWorldPosition;
  varying float vDistance;
  varying float vHeight;
  
  uniform vec3 playerPosition;
  
  void main() {
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    vDistance = distance(worldPosition.xyz, playerPosition);
    vHeight = worldPosition.y;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Shared noise functions
export const NOISE_FUNCTIONS = `
  vec3 mod289(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 mod289(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
  }
  
  vec4 permute(vec4 x) {
    return mod289(((x*34.0)+1.0)*x);
  }
  
  vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
  }
  
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }
  
  float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
`;

// Shared color transition function
export const COLOR_TRANSITION_FUNCTION = `
  vec3 getFogColorForTime(float time, vec3 dayColor, vec3 nightColor, vec3 sunriseColor, vec3 sunsetColor) {
    vec3 currentColor = dayColor;
    
    if (time >= 0.15 && time <= 0.35) {
      if (time <= 0.25) {
        float factor = (time - 0.15) / 0.1;
        factor = factor * factor * (3.0 - 2.0 * factor);
        currentColor = mix(nightColor, sunriseColor, factor);
      } else {
        float factor = (time - 0.25) / 0.1;
        factor = factor * factor * (3.0 - 2.0 * factor);
        currentColor = mix(sunriseColor, dayColor, factor);
      }
    } else if (time >= 0.35 && time <= 0.65) {
      currentColor = dayColor;
    } else if (time >= 0.65 && time <= 0.85) {
      if (time <= 0.75) {
        float factor = (time - 0.65) / 0.1;
        factor = factor * factor * (3.0 - 2.0 * factor);
        currentColor = mix(dayColor, sunsetColor, factor);
      } else {
        float factor = (time - 0.75) / 0.1;
        factor = factor * factor * (3.0 - 2.0 * factor);
        currentColor = mix(sunsetColor, nightColor, factor);
      }
    } else {
      currentColor = nightColor;
    }
    
    return currentColor;
  }
`;

export const UNIFIED_FOG_FRAGMENT_SHADER = `
  uniform float time;
  uniform float timeOfDay;
  uniform vec3 dayFogColor;
  uniform vec3 nightFogColor;
  uniform vec3 sunriseFogColor;
  uniform vec3 sunsetFogColor;
  uniform float fogDensityMultiplier;
  uniform float maxFogDistance;
  uniform float maxFogOpacity;
  uniform float blendingAlpha;
  uniform float fogDensity;
  uniform float layerHeight;
  uniform vec3 playerPosition;
  uniform float noiseScale;
  uniform vec2 windDirection;
  uniform int fogType; // 0=main, 1=wall, 2=ground
  
  varying vec3 vWorldPosition;
  varying vec3 vPosition;
  varying vec2 vUv;
  varying float vDistance;
  
  ${NOISE_FUNCTIONS}
  ${COLOR_TRANSITION_FUNCTION}
  
  void main() {
    vec3 dynamicFogColor = getFogColorForTime(timeOfDay, dayFogColor, nightFogColor, sunriseFogColor, sunsetFogColor);
    
    // Create animated noise for fog movement
    vec3 noisePos = vWorldPosition * noiseScale;
    noisePos.xy += windDirection * time * 0.1;
    
    float noise1 = snoise(noisePos);
    float noise2 = snoise(noisePos * 2.0 + vec3(time * 0.05));
    float noise3 = snoise(noisePos * 4.0 - vec3(time * 0.03));
    
    float combinedNoise = noise1 * 0.6 + noise2 * 0.3 + noise3 * 0.1;
    
    // Calculate height-based density
    float heightFactor = 1.0 - abs(vPosition.y) / layerHeight;
    heightFactor = smoothstep(0.0, 1.0, heightFactor);
    
    // Distance-based fog with dynamic parameters
    float distanceFactor = 1.0 - smoothstep(15.0, maxFogDistance, vDistance);
    
    // Calculate final fog density with smooth multiplier
    float density = fogDensity * heightFactor * distanceFactor * fogDensityMultiplier;
    density *= (0.8 + combinedNoise * 0.4);
    density = clamp(density, 0.0, maxFogOpacity);
    
    // Edge fade for smooth blending
    float edgeFade = smoothstep(0.0, 0.1, vUv.x) * smoothstep(1.0, 0.9, vUv.x) *
                    smoothstep(0.0, 0.1, vUv.y) * smoothstep(1.0, 0.9, vUv.y);
    
    density *= edgeFade;
    
    gl_FragColor = vec4(dynamicFogColor, density);
  }
`;

export const ATMOSPHERIC_FOG_FRAGMENT_SHADER = `
  uniform float timeOfDay;
  uniform vec3 dayFogColor;
  uniform vec3 nightFogColor;
  uniform vec3 sunriseFogColor;
  uniform vec3 sunsetFogColor;
  uniform float atmosphericDensity;
  uniform float atmosphericMultiplier;
  uniform float maxAtmosphericDistance;
  uniform float time;
  uniform float noiseScale;
  
  varying vec3 vWorldPosition;
  varying float vDistance;
  varying float vHeight;
  varying vec2 vUv;
  
  ${NOISE_FUNCTIONS}
  ${COLOR_TRANSITION_FUNCTION}
  
  void main() {
    vec3 dynamicFogColor = getFogColorForTime(timeOfDay, dayFogColor, nightFogColor, sunriseFogColor, sunsetFogColor);
    
    vec2 noisePos = vWorldPosition.xz * noiseScale + time * 0.005;
    float noiseValue = noise(noisePos) * 0.5 + 0.5;
    
    // Enhanced atmospheric perspective
    float heightFactor = clamp(vHeight / 40.0, 0.0, 1.0);
    float distanceFactor = smoothstep(150.0, maxAtmosphericDistance, vDistance);
    
    // Atmospheric scattering effect
    float scatteringEffect = 1.0 - exp(-vDistance * 0.002);
    vec3 scatteredColor = mix(dynamicFogColor, vec3(0.8, 0.85, 0.9), scatteringEffect * 0.2);
    
    float density = atmosphericDensity * distanceFactor * (0.5 + heightFactor * 0.5) * atmosphericMultiplier * noiseValue;
    density = clamp(density, 0.0, 0.4);
    
    gl_FragColor = vec4(scatteredColor, density);
  }
`;
