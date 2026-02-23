

## Download Page for Source Files

### Overview
Add a `/downloads` route with a page listing all tree, rock, bush, and grass system files as clickable download buttons. Each button will download the actual source file as a `.ts` text file.

### Approach
Use Vite's `?raw` import feature to import each source file's contents as a string at build time, then create download links using `Blob` URLs when clicked.

### Technical Details

**New file: `src/pages/Downloads.tsx`**
- A styled page with sections for Trees, Rocks, Bushes, and Grass
- Each section lists the relevant files with a download button
- Clicking a button creates a `Blob` from the raw imported string and triggers a browser download via a temporary `<a>` element
- Files to include (~25 files):
  - **Trees:** `TreeSpecies.ts`, `RealisticTreeGenerator.ts`, `OrganicShapeGenerator.ts`, `ForestBiomeManager.ts`, `TreeGenerator.ts`, `VegetationConfig.ts`
  - **Rocks:** `RockVariationConfig.ts`, `RockShapeConfig.ts`, `RockShapeFactory.ts`, `RockClusterGenerator.ts`, `RockMaterialGenerator.ts`
  - **Bushes:** `BushSpecies.ts`, `SmallBushSpecies.ts`, `BushGenerator.ts`, `BushClusterGenerator.ts`, `OptimizedMaterialGenerator.ts`, `NaturalGrowthSimulator.ts`
  - **Grass/Biomes:** `GrassGeometry.ts`, `GrassShader.ts`, `GrassConfig.ts`, `SeededGrassDistribution.ts`, `OrganicBiomeGenerator.ts`, `DeterministicBiomeManager.ts`, `BiomeSeedManager.ts`, `BiomeManager.ts`
- A "Download All" button per section that downloads all files in that category sequentially

**Modified file: `src/App.tsx`**
- Add a `/downloads` route pointing to the new page

### UI Design
- Dark themed page (consistent with the game aesthetic)
- Four collapsible sections (Trees, Rocks, Bushes, Grass)
- Each file row shows: filename, file size estimate, and a download icon button
- "Download All" button at the top of each section

