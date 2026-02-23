
import { useState } from 'react';
import { Download, ChevronDown, ChevronRight, FileCode } from 'lucide-react';

// Raw imports - Trees
import TreeSpecies from '@/game/world/vegetation/TreeSpecies.ts?raw';
import RealisticTreeGenerator from '@/game/world/vegetation/RealisticTreeGenerator.ts?raw';
import OrganicShapeGenerator from '@/game/world/vegetation/OrganicShapeGenerator.ts?raw';
import ForestBiomeManager from '@/game/world/vegetation/ForestBiomeManager.ts?raw';
import TreeGenerator from '@/game/world/vegetation/TreeGenerator.ts?raw';
import VegetationConfig from '@/game/world/vegetation/VegetationConfig.ts?raw';

// Raw imports - Rocks
import RockVariationConfig from '@/game/world/rocks/config/RockVariationConfig.ts?raw';
import RockShapeConfig from '@/game/world/rocks/config/RockShapeConfig.ts?raw';
import RockShapeFactory from '@/game/world/rocks/generators/RockShapeFactory.ts?raw';
import RockClusterGenerator from '@/game/world/rocks/generators/RockClusterGenerator.ts?raw';
import RockMaterialGenerator from '@/game/world/rocks/materials/RockMaterialGenerator.ts?raw';

// Raw imports - Bushes
import BushSpecies from '@/game/world/vegetation/BushSpecies.ts?raw';
import SmallBushSpecies from '@/game/world/vegetation/SmallBushSpecies.ts?raw';
import BushGenerator from '@/game/world/vegetation/BushGenerator.ts?raw';
import BushClusterGenerator from '@/game/world/vegetation/BushClusterGenerator.ts?raw';
import OptimizedMaterialGenerator from '@/game/world/vegetation/OptimizedMaterialGenerator.ts?raw';
import NaturalGrowthSimulator from '@/game/world/vegetation/NaturalGrowthSimulator.ts?raw';

// Raw imports - Grass & Biomes
import GrassGeometry from '@/game/vegetation/core/GrassGeometry.ts?raw';
import GrassShader from '@/game/vegetation/core/GrassShader.ts?raw';
import GrassConfig from '@/game/vegetation/core/GrassConfig.ts?raw';
import SeededGrassDistribution from '@/game/vegetation/SeededGrassDistribution.ts?raw';
import OrganicBiomeGenerator from '@/game/vegetation/biomes/OrganicBiomeGenerator.ts?raw';
import DeterministicBiomeManager from '@/game/vegetation/biomes/DeterministicBiomeManager.ts?raw';
import BiomeSeedManager from '@/game/vegetation/biomes/BiomeSeedManager.ts?raw';
import BiomeManager from '@/game/vegetation/biomes/BiomeManager.ts?raw';

interface FileEntry {
  name: string;
  content: string;
}

interface Section {
  title: string;
  icon: string;
  files: FileEntry[];
}

const sections: Section[] = [
  {
    title: 'Trees',
    icon: '🌲',
    files: [
      { name: 'TreeSpecies.ts', content: TreeSpecies },
      { name: 'RealisticTreeGenerator.ts', content: RealisticTreeGenerator },
      { name: 'OrganicShapeGenerator.ts', content: OrganicShapeGenerator },
      { name: 'ForestBiomeManager.ts', content: ForestBiomeManager },
      { name: 'TreeGenerator.ts', content: TreeGenerator },
      { name: 'VegetationConfig.ts', content: VegetationConfig },
    ],
  },
  {
    title: 'Rocks',
    icon: '🪨',
    files: [
      { name: 'RockVariationConfig.ts', content: RockVariationConfig },
      { name: 'RockShapeConfig.ts', content: RockShapeConfig },
      { name: 'RockShapeFactory.ts', content: RockShapeFactory },
      { name: 'RockClusterGenerator.ts', content: RockClusterGenerator },
      { name: 'RockMaterialGenerator.ts', content: RockMaterialGenerator },
    ],
  },
  {
    title: 'Bushes',
    icon: '🌿',
    files: [
      { name: 'BushSpecies.ts', content: BushSpecies },
      { name: 'SmallBushSpecies.ts', content: SmallBushSpecies },
      { name: 'BushGenerator.ts', content: BushGenerator },
      { name: 'BushClusterGenerator.ts', content: BushClusterGenerator },
      { name: 'OptimizedMaterialGenerator.ts', content: OptimizedMaterialGenerator },
      { name: 'NaturalGrowthSimulator.ts', content: NaturalGrowthSimulator },
    ],
  },
  {
    title: 'Grass & Biomes',
    icon: '🌾',
    files: [
      { name: 'GrassGeometry.ts', content: GrassGeometry },
      { name: 'GrassShader.ts', content: GrassShader },
      { name: 'GrassConfig.ts', content: GrassConfig },
      { name: 'SeededGrassDistribution.ts', content: SeededGrassDistribution },
      { name: 'OrganicBiomeGenerator.ts', content: OrganicBiomeGenerator },
      { name: 'DeterministicBiomeManager.ts', content: DeterministicBiomeManager },
      { name: 'BiomeSeedManager.ts', content: BiomeSeedManager },
      { name: 'BiomeManager.ts', content: BiomeManager },
    ],
  },
];

function formatSize(content: string): string {
  const bytes = new Blob([content]).size;
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadAll(files: FileEntry[]) {
  files.forEach((f, i) => {
    setTimeout(() => downloadFile(f.name, f.content), i * 200);
  });
}

function SectionBlock({ section }: { section: Section }) {
  const [open, setOpen] = useState(true);

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden bg-white/[0.03]">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.05] transition-colors"
      >
        <span className="flex items-center gap-3 text-lg font-semibold text-white">
          <span>{section.icon}</span>
          {section.title}
          <span className="text-sm font-normal text-white/40">
            {section.files.length} files
          </span>
        </span>
        {open ? (
          <ChevronDown className="w-5 h-5 text-white/50" />
        ) : (
          <ChevronRight className="w-5 h-5 text-white/50" />
        )}
      </button>

      {open && (
        <div className="px-5 pb-4">
          <button
            onClick={() => downloadAll(section.files)}
            className="mb-3 flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Download All {section.title}
          </button>

          <div className="space-y-1">
            {section.files.map((file) => (
              <div
                key={file.name}
                className="flex items-center justify-between px-3 py-2 rounded hover:bg-white/[0.05] transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <FileCode className="w-4 h-4 text-blue-400/70" />
                  <span className="text-sm text-white/80 font-mono">
                    {file.name}
                  </span>
                  <span className="text-xs text-white/30">
                    {formatSize(file.content)}
                  </span>
                </div>
                <button
                  onClick={() => downloadFile(file.name, file.content)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 rounded hover:bg-white/10 transition-all"
                  title={`Download ${file.name}`}
                >
                  <Download className="w-4 h-4 text-white/60" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Downloads() {
  const totalFiles = sections.reduce((sum, s) => sum + s.files.length, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Source Downloads</h1>
          <p className="text-white/50">
            {totalFiles} procedural generation files — trees, rocks, bushes &
            grass systems
          </p>
        </div>

        {sections.map((section) => (
          <SectionBlock key={section.title} section={section} />
        ))}
      </div>
    </div>
  );
}
