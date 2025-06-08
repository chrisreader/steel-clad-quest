
import * as THREE from 'three';

export interface PoissonPoint {
  position: THREE.Vector2;
  isActive: boolean;
}

export class PoissonDiskSampling {
  /**
   * Generate organic points using Poisson Disk Sampling
   * This eliminates grid-based patterns and creates natural distributions
   */
  static generatePoissonPoints(
    bounds: { min: THREE.Vector2; max: THREE.Vector2 },
    minDistance: number,
    maxAttempts: number = 30
  ): THREE.Vector2[] {
    const cellSize = minDistance / Math.sqrt(2);
    const gridWidth = Math.ceil((bounds.max.x - bounds.min.x) / cellSize);
    const gridHeight = Math.ceil((bounds.max.y - bounds.min.y) / cellSize);
    
    // Initialize grid
    const grid: (PoissonPoint | null)[][] = [];
    for (let i = 0; i < gridWidth; i++) {
      grid[i] = new Array(gridHeight).fill(null);
    }
    
    const points: THREE.Vector2[] = [];
    const activeList: PoissonPoint[] = [];
    
    // Start with a random point
    const firstPoint = new THREE.Vector2(
      bounds.min.x + Math.random() * (bounds.max.x - bounds.min.x),
      bounds.min.y + Math.random() * (bounds.max.y - bounds.min.y)
    );
    
    const firstPoissonPoint: PoissonPoint = {
      position: firstPoint,
      isActive: true
    };
    
    points.push(firstPoint);
    activeList.push(firstPoissonPoint);
    
    const gridX = Math.floor((firstPoint.x - bounds.min.x) / cellSize);
    const gridY = Math.floor((firstPoint.y - bounds.min.y) / cellSize);
    if (gridX >= 0 && gridX < gridWidth && gridY >= 0 && gridY < gridHeight) {
      grid[gridX][gridY] = firstPoissonPoint;
    }
    
    while (activeList.length > 0) {
      const randomIndex = Math.floor(Math.random() * activeList.length);
      const currentPoint = activeList[randomIndex];
      let found = false;
      
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        // Generate point between minDistance and 2*minDistance
        const angle = Math.random() * Math.PI * 2;
        const radius = minDistance + Math.random() * minDistance;
        
        const newPoint = new THREE.Vector2(
          currentPoint.position.x + Math.cos(angle) * radius,
          currentPoint.position.y + Math.sin(angle) * radius
        );
        
        // Check if point is within bounds
        if (newPoint.x < bounds.min.x || newPoint.x >= bounds.max.x ||
            newPoint.y < bounds.min.y || newPoint.y >= bounds.max.y) {
          continue;
        }
        
        // Check if point is far enough from existing points
        if (this.isValidPoint(newPoint, grid, bounds, cellSize, minDistance, gridWidth, gridHeight)) {
          const newPoissonPoint: PoissonPoint = {
            position: newPoint,
            isActive: true
          };
          
          points.push(newPoint);
          activeList.push(newPoissonPoint);
          
          const newGridX = Math.floor((newPoint.x - bounds.min.x) / cellSize);
          const newGridY = Math.floor((newPoint.y - bounds.min.y) / cellSize);
          if (newGridX >= 0 && newGridX < gridWidth && newGridY >= 0 && newGridY < gridHeight) {
            grid[newGridX][newGridY] = newPoissonPoint;
          }
          
          found = true;
          break;
        }
      }
      
      if (!found) {
        activeList.splice(randomIndex, 1);
      }
    }
    
    return points;
  }
  
  private static isValidPoint(
    point: THREE.Vector2,
    grid: (PoissonPoint | null)[][],
    bounds: { min: THREE.Vector2; max: THREE.Vector2 },
    cellSize: number,
    minDistance: number,
    gridWidth: number,
    gridHeight: number
  ): boolean {
    const gridX = Math.floor((point.x - bounds.min.x) / cellSize);
    const gridY = Math.floor((point.y - bounds.min.y) / cellSize);
    
    // Check neighboring cells
    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        const checkX = gridX + dx;
        const checkY = gridY + dy;
        
        if (checkX >= 0 && checkX < gridWidth && checkY >= 0 && checkY < gridHeight) {
          const neighbor = grid[checkX][checkY];
          if (neighbor && point.distanceTo(neighbor.position) < minDistance) {
            return false;
          }
        }
      }
    }
    
    return true;
  }
  
  /**
   * Generate blue noise distribution for even more organic patterns
   */
  static generateBlueNoisePoints(
    bounds: { min: THREE.Vector2; max: THREE.Vector2 },
    targetDensity: number,
    jitterStrength: number = 0.8
  ): THREE.Vector2[] {
    const points: THREE.Vector2[] = [];
    const area = (bounds.max.x - bounds.min.x) * (bounds.max.y - bounds.min.y);
    const numPoints = Math.floor(area * targetDensity);
    const gridSpacing = Math.sqrt(area / numPoints);
    
    const gridCols = Math.ceil((bounds.max.x - bounds.min.x) / gridSpacing);
    const gridRows = Math.ceil((bounds.max.y - bounds.min.y) / gridSpacing);
    
    for (let row = 0; row < gridRows; row++) {
      for (let col = 0; col < gridCols; col++) {
        const baseX = bounds.min.x + col * gridSpacing + gridSpacing * 0.5;
        const baseY = bounds.min.y + row * gridSpacing + gridSpacing * 0.5;
        
        // Apply jitter to break up grid pattern
        const jitterX = (Math.random() - 0.5) * gridSpacing * jitterStrength;
        const jitterY = (Math.random() - 0.5) * gridSpacing * jitterStrength;
        
        const finalX = baseX + jitterX;
        const finalY = baseY + jitterY;
        
        // Ensure point stays within bounds
        if (finalX >= bounds.min.x && finalX <= bounds.max.x &&
            finalY >= bounds.min.y && finalY <= bounds.max.y) {
          points.push(new THREE.Vector2(finalX, finalY));
        }
      }
    }
    
    return points;
  }
}
