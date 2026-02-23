
import React, { useState } from 'react';

const ROCK_SHAPES = [
  { type: 'boulder', baseGeometry: 'icosahedron', deformationIntensity: 0.15, weatheringLevel: 0.6, shapeModifier: 'erode' },
  { type: 'spire', baseGeometry: 'icosahedron', deformationIntensity: 0.2, weatheringLevel: 0.3, shapeModifier: 'stretch' },
  { type: 'slab', baseGeometry: 'sphere', deformationIntensity: 0.1, weatheringLevel: 0.8, shapeModifier: 'flatten' },
  { type: 'angular', baseGeometry: 'dodecahedron', deformationIntensity: 0.2, weatheringLevel: 0.4, shapeModifier: 'fracture' },
  { type: 'weathered', baseGeometry: 'sphere', deformationIntensity: 0.2, weatheringLevel: 0.9, shapeModifier: 'erode' },
  { type: 'flattened', baseGeometry: 'sphere', deformationIntensity: 0.15, weatheringLevel: 0.7, shapeModifier: 'flatten' },
  { type: 'jagged', baseGeometry: 'icosahedron', deformationIntensity: 0.2, weatheringLevel: 0.5, shapeModifier: 'fracture' },
  { type: 'cluster', baseGeometry: 'custom', deformationIntensity: 0.2, weatheringLevel: 0.6, shapeModifier: 'none' }
];

const ROCK_VARIATIONS = [
  { category: 'tiny', sizeRange: [0.05, 0.15], weight: 70, isCluster: false, shapePersonality: 'character' },
  { category: 'small', sizeRange: [0.15, 0.4], weight: 20, isCluster: false, shapePersonality: 'character' },
  { category: 'medium', sizeRange: [0.4, 1.2], weight: 8, isCluster: false, shapePersonality: 'basic' },
  { category: 'large', sizeRange: [2.0, 4.0], weight: 0.8, isCluster: true, clusterSize: [3, 5], shapePersonality: 'character' },
  { category: 'massive', sizeRange: [4.0, 8.0], weight: 0.1, isCluster: true, clusterSize: [4, 7], shapePersonality: 'character' }
];

const ROCK_TYPES = [
  { color: '#8B7355', name: 'granite' },
  { color: '#696969', name: 'basalt' },
  { color: '#A0A0A0', name: 'limestone' },
  { color: '#8B7D6B', name: 'sandstone' },
  { color: '#556B2F', name: 'moss_covered' },
  { color: '#2F4F4F', name: 'slate' },
  { color: '#8B4513', name: 'ironstone' },
];

const ROLES = [
  { name: 'Foundation', pct: '40%', color: '#b45309', desc: 'Largest, stable shapes (boulder/weathered/slab). Buried 15% into ground. Max tilt ~17°. 70% moisture weathering tint.' },
  { name: 'Support', pct: '40%', color: '#6d28d9', desc: 'Medium rocks lean against foundations. Distance = (baseSize + rockSize) × 0.4. Full random rotation on all axes.' },
  { name: 'Accent', pct: '20%', color: '#0891b2', desc: 'Smallest, most varied. 60% on top of others, 40% fill ground gaps. Full deformation intensity, fresher material.' },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

// Simple rock silhouette SVG for each shape type
const RockSilhouette: React.FC<{ type: string; size?: number; color?: string }> = ({ type, size = 40, color = '#888' }) => {
  const paths: Record<string, string> = {
    boulder: 'M5 35 Q8 10 20 8 Q32 6 35 35 Z',
    spire: 'M15 35 L20 5 L25 35 Z',
    slab: 'M3 30 Q5 22 20 20 Q35 22 37 30 Z',
    angular: 'M5 35 L12 10 L25 5 L35 15 L38 35 Z',
    weathered: 'M5 35 Q3 20 15 12 Q25 8 32 15 Q38 22 35 35 Z',
    flattened: 'M2 32 Q5 24 20 22 Q35 24 38 32 Z',
    jagged: 'M5 35 L10 18 L15 25 L22 5 L28 20 L35 12 L38 35 Z',
    cluster: 'M5 35 Q8 20 15 18 Q18 25 22 15 Q28 10 32 20 Q36 25 35 35 Z',
  };
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <path d={paths[type] || paths.boulder} fill={color} stroke="#555" strokeWidth="1" />
    </svg>
  );
};

// Visual cluster stacking diagram
const ClusterStackDiagram: React.FC<{ clusterSize: [number, number]; category: string }> = ({ clusterSize, category }) => {
  const [min, max] = clusterSize;
  const count = Math.round((min + max) / 2);
  const foundationCount = Math.min(2, Math.floor(count * 0.4));
  const supportCount = Math.floor(count * 0.4);
  const accentCount = count - foundationCount - supportCount;

  // Generate pseudo-random positions for rocks
  const rocks: { x: number; y: number; r: number; role: string; color: string }[] = [];

  // Foundation rocks - big, at bottom
  for (let i = 0; i < foundationCount; i++) {
    const r = 18 + (i % 2) * 4;
    rocks.push({
      x: 60 + (i - foundationCount / 2) * 35,
      y: 100 - r * 0.15 * 100,
      r,
      role: 'foundation',
      color: '#92400e',
    });
  }

  // Support rocks - medium, lean against foundations
  for (let i = 0; i < supportCount; i++) {
    const base = rocks[i % foundationCount];
    const angle = ((i + 1) / (supportCount + 1)) * Math.PI;
    const dist = (base.r + 10) * 0.5;
    const r = 12 + (i % 3) * 2;
    rocks.push({
      x: base.x + Math.cos(angle) * dist,
      y: base.y - r * 0.5 + Math.sin(angle) * dist * 0.3,
      r,
      role: 'support',
      color: '#7c3aed',
    });
  }

  // Accent rocks - small, on top or in gaps
  for (let i = 0; i < accentCount; i++) {
    const base = rocks[Math.floor(i * 1.7) % rocks.length];
    const onTop = i % 3 !== 2;
    const r = 6 + (i % 2) * 3;
    rocks.push({
      x: base.x + (onTop ? (i % 2 === 0 ? -5 : 8) : 20 + i * 8),
      y: onTop ? base.y - base.r - r * 0.4 : base.y + 5,
      r,
      role: 'accent',
      color: '#0e7490',
    });
  }

  return (
    <div className="flex flex-col items-center">
      <svg width={160} height={130} viewBox="0 0 160 130">
        {/* Ground line */}
        <line x1="10" y1="115" x2="150" y2="115" stroke="#4a4a2a" strokeWidth="2" strokeDasharray="4 2" />
        <text x="80" y="128" textAnchor="middle" fill="#888" fontSize="9">ground level</text>
        {/* Rocks */}
        {rocks.map((rock, i) => (
          <g key={i}>
            <ellipse
              cx={rock.x}
              cy={Math.min(rock.y, 115 - rock.r * 0.3)}
              rx={rock.r}
              ry={rock.r * 0.7}
              fill={rock.color}
              stroke="#333"
              strokeWidth="1"
              opacity={0.85}
            />
            <text
              x={rock.x}
              y={Math.min(rock.y, 115 - rock.r * 0.3) + 3}
              textAnchor="middle"
              fill="white"
              fontSize="7"
              fontWeight="bold"
            >
              {rock.role[0].toUpperCase()}
            </text>
          </g>
        ))}
      </svg>
      <div className="text-xs text-gray-400 mt-1">
        {category} cluster: {foundationCount}F + {supportCount}S + {accentCount}A = {count} rocks
      </div>
    </div>
  );
};

const RockClusterDebugPanel: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'variations' | 'shapes' | 'stacking' | 'materials'>('stacking');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <div
        className="relative w-[900px] max-w-[95vw] max-h-[90vh] overflow-y-auto rounded-xl border border-gray-700"
        style={{ background: '#181a20' }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-700" style={{ background: '#181a20' }}>
          <div>
            <h2 className="text-xl font-bold text-amber-400">🏔️ Rock Cluster Debug</h2>
            <p className="text-xs text-gray-500">Procedural rock generation system inspector</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl leading-none px-2">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3">
          {(['stacking', 'variations', 'shapes', 'materials'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-t text-sm font-medium transition-colors ${
                activeTab === tab
                  ? 'bg-gray-800 text-amber-400 border border-b-0 border-gray-600'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {tab === 'stacking' ? '🧱 Stacking' : tab === 'variations' ? '📏 Variations' : tab === 'shapes' ? '🪨 Shapes' : '🎨 Materials'}
            </button>
          ))}
        </div>

        <div className="px-6 py-4">
          {/* ─── STACKING TAB ─── */}
          {activeTab === 'stacking' && (
            <div className="space-y-6">
              {/* Role hierarchy */}
              <div>
                <h3 className="text-sm font-bold text-gray-300 mb-3">3-Role Hierarchy</h3>
                <div className="grid grid-cols-3 gap-3">
                  {ROLES.map(role => (
                    <div key={role.name} className="rounded-lg p-3 border" style={{ borderColor: role.color, background: `${role.color}15` }}>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full" style={{ background: role.color }} />
                        <span className="font-bold text-white text-sm">{role.name}</span>
                        <span className="text-xs text-gray-400">({role.pct})</span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{role.desc}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual cluster diagrams */}
              <div>
                <h3 className="text-sm font-bold text-gray-300 mb-3">Cluster Stacking Visualization</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-xs font-bold text-amber-400 mb-2">Large Cluster (3–5 rocks)</h4>
                    <ClusterStackDiagram clusterSize={[3, 5]} category="large" />
                  </div>
                  <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                    <h4 className="text-xs font-bold text-amber-400 mb-2">Massive Cluster (4–7 rocks)</h4>
                    <ClusterStackDiagram clusterSize={[4, 7]} category="massive" />
                  </div>
                </div>
              </div>

              {/* Stacking formula breakdown */}
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-bold text-gray-300 mb-3">Positioning Formulas</h3>
                <div className="space-y-3 text-xs font-mono">
                  <div>
                    <span className="text-amber-400">Foundation Y</span>
                    <span className="text-gray-500"> = </span>
                    <span className="text-green-400">rockSize × 0.15</span>
                    <span className="text-gray-600 ml-2">// buried 15% into ground</span>
                  </div>
                  <div>
                    <span className="text-amber-400">Foundation Tilt</span>
                    <span className="text-gray-500"> = </span>
                    <span className="text-green-400">random × 0.3 rad</span>
                    <span className="text-gray-600 ml-2">// max ~17° for stability</span>
                  </div>
                  <div>
                    <span className="text-purple-400">Support Distance</span>
                    <span className="text-gray-500"> = </span>
                    <span className="text-green-400">(baseSize + rockSize) × 0.4</span>
                    <span className="text-gray-600 ml-2">// overlap/lean</span>
                  </div>
                  <div>
                    <span className="text-purple-400">Support Y</span>
                    <span className="text-gray-500"> = </span>
                    <span className="text-green-400">baseY + rockSize × 0.3 + rand × baseSize × 0.2</span>
                  </div>
                  <div>
                    <span className="text-cyan-400">Accent On-Top Y</span>
                    <span className="text-gray-500"> = </span>
                    <span className="text-green-400">baseY + baseSize × 0.6 + rockSize × 0.3</span>
                  </div>
                  <div>
                    <span className="text-cyan-400">Accent Gap Y</span>
                    <span className="text-gray-500"> = </span>
                    <span className="text-green-400">baseY + rockSize × 0.2</span>
                    <span className="text-gray-600 ml-2">// at distance baseSize × (0.8–1.2)</span>
                  </div>
                </div>
              </div>

              {/* Environmental details */}
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <h3 className="text-sm font-bold text-gray-300 mb-3">Environmental Details (Large+ Formations)</h3>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div className="bg-gray-800 rounded p-3">
                    <div className="text-yellow-500 font-bold mb-1">🪨 Sediment</div>
                    <p className="text-gray-400">Flat patches & spheres near base. Beige-brown tones. Adds "settled" feel.</p>
                  </div>
                  <div className="bg-gray-800 rounded p-3">
                    <div className="text-orange-400 font-bold mb-1">💥 Debris Field</div>
                    <p className="text-gray-400">12–20 fragments. 60% clustered near previous debris, 40% scattered. Mix of pebbles & rock chips.</p>
                  </div>
                  <div className="bg-gray-800 rounded p-3">
                    <div className="text-stone-400 font-bold mb-1">🫘 Micro-Pebbles</div>
                    <p className="text-gray-400">Clusters of 6–12 tiny pebbles at formation perimeter. Blends into terrain.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── VARIATIONS TAB ─── */}
          {activeTab === 'variations' && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-gray-300 mb-2">Size Categories & Spawn Weights</h3>
              {ROCK_VARIATIONS.map(v => {
                const barWidth = Math.min(100, v.weight * 1.4);
                return (
                  <div key={v.category} className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <span className="text-amber-400 font-bold text-sm uppercase w-16">{v.category}</span>
                        <span className="text-gray-400 text-xs">{v.sizeRange[0]}–{v.sizeRange[1]} units</span>
                        {v.isCluster && (
                          <span className="bg-purple-900 text-purple-300 text-xs px-2 py-0.5 rounded">
                            cluster {v.clusterSize?.[0]}–{v.clusterSize?.[1]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">weight: {v.weight}%</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded ${v.shapePersonality === 'character' ? 'bg-green-900 text-green-300' : 'bg-gray-700 text-gray-400'}`}>
                          {v.shapePersonality}
                        </span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${barWidth}%`, background: 'linear-gradient(90deg, #b45309, #f59e0b)' }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ─── SHAPES TAB ─── */}
          {activeTab === 'shapes' && (
            <div className="grid grid-cols-4 gap-3">
              {ROCK_SHAPES.map(shape => (
                <div key={shape.type} className="bg-gray-900 rounded-lg p-3 border border-gray-700 flex flex-col items-center">
                  <RockSilhouette type={shape.type} size={50} color="#a0a0a0" />
                  <span className="text-amber-400 font-bold text-sm mt-2 capitalize">{shape.type}</span>
                  <div className="mt-2 w-full space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-500">geometry</span>
                      <span className="text-gray-300">{shape.baseGeometry}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">deformation</span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-red-500 rounded-full" style={{ width: `${shape.deformationIntensity * 500}%` }} />
                        </div>
                        <span className="text-gray-400">{shape.deformationIntensity}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">weathering</span>
                      <div className="flex items-center gap-1">
                        <div className="w-12 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-600 rounded-full" style={{ width: `${shape.weatheringLevel * 100}%` }} />
                        </div>
                        <span className="text-gray-400">{shape.weatheringLevel}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">modifier</span>
                      <span className="text-cyan-400">{shape.shapeModifier}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ─── MATERIALS TAB ─── */}
          {activeTab === 'materials' && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-gray-300 mb-2">Stone Types</h3>
              <div className="grid grid-cols-4 gap-3">
                {ROCK_TYPES.map(rt => (
                  <div key={rt.name} className="bg-gray-900 rounded-lg p-3 border border-gray-700 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg border border-gray-600" style={{ background: rt.color }} />
                    <span className="text-gray-300 text-sm capitalize">{rt.name.replace('_', ' ')}</span>
                  </div>
                ))}
              </div>

              <h3 className="text-sm font-bold text-gray-300 mb-2 mt-6">Role-Based Weathering</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <div className="text-amber-500 font-bold mb-2">Foundation</div>
                  <ul className="text-gray-400 space-y-1 list-disc list-inside">
                    <li>+0.1 roughness</li>
                    <li>70% chance dark moisture tint (#2A2A1A)</li>
                    <li>Lerp 20% toward weathering color</li>
                  </ul>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <div className="text-purple-400 font-bold mb-2">Support</div>
                  <ul className="text-gray-400 space-y-1 list-disc list-inside">
                    <li>40% chance moderate tint (#3A3A2A)</li>
                    <li>Lerp 10% toward weathering color</li>
                    <li>Standard roughness</li>
                  </ul>
                </div>
                <div className="bg-gray-900 rounded-lg p-3 border border-gray-700">
                  <div className="text-cyan-400 font-bold mb-2">Accent</div>
                  <ul className="text-gray-400 space-y-1 list-disc list-inside">
                    <li>-0.1 roughness (fresher look)</li>
                    <li>No extra weathering tint</li>
                    <li>Min roughness 0.6</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(RockClusterDebugPanel);
