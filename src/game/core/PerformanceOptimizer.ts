
export class PerformanceOptimizer {
  private static frameCount: number = 0;
  private static lastFpsCheck: number = 0;
  private static currentFps: number = 60;
  private static performanceMode: 'high' | 'medium' | 'low' = 'high';
  
  public static updateFrameCount(): void {
    this.frameCount++;
    
    // Check FPS every 2 seconds instead of every frame
    if (this.frameCount % 120 === 0) {
      const now = performance.now();
      if (this.lastFpsCheck > 0) {
        const deltaTime = (now - this.lastFpsCheck) / 1000;
        this.currentFps = 120 / deltaTime;
        this.adjustPerformanceMode();
      }
      this.lastFpsCheck = now;
    }
  }
  
  private static adjustPerformanceMode(): void {
    if (this.currentFps < 30) {
      this.performanceMode = 'low';
    } else if (this.currentFps < 45) {
      this.performanceMode = 'medium';
    } else {
      this.performanceMode = 'high';
    }
  }
  
  public static shouldUpdateWind(): boolean {
    // Update wind every 4-6 frames based on performance mode
    const windInterval = this.performanceMode === 'high' ? 4 : 
                        this.performanceMode === 'medium' ? 6 : 8;
    return this.frameCount % windInterval === 0;
  }
  
  public static shouldUpdateGrassMaterials(): boolean {
    // Update grass materials less frequently
    const grassInterval = this.performanceMode === 'high' ? 12 : 
                          this.performanceMode === 'medium' ? 18 : 24;
    return this.frameCount % grassInterval === 0;
  }
  
  public static shouldUpdateFog(): boolean {
    // Update fog checking much less frequently
    const fogInterval = this.performanceMode === 'high' ? 300 : 
                       this.performanceMode === 'medium' ? 450 : 600;
    return this.frameCount % fogInterval === 0;
  }
  
  public static shouldLogPerformance(): boolean {
    // Reduce performance logging to every 600 frames (10 seconds at 60fps)
    return this.frameCount % 600 === 0;
  }
  
  public static shouldUpdateTerrainCache(): boolean {
    // Clear terrain cache less frequently based on performance
    const cacheInterval = this.performanceMode === 'high' ? 900 : 
                         this.performanceMode === 'medium' ? 1200 : 1800;
    return this.frameCount % cacheInterval === 0;
  }
  
  public static getPerformanceMode(): 'high' | 'medium' | 'low' {
    return this.performanceMode;
  }
  
  public static getCurrentFPS(): number {
    return this.currentFps;
  }
}
