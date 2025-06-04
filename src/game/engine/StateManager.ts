import { GameState } from '../../types/GameTypes';

export class StateManager {
  private gameState: GameState;
  private totalElapsedTime: number = 0;
  
  // Callbacks
  private onUpdateHealth: (health: number) => void;
  private onUpdateGold: (gold: number) => void;
  private onUpdateStamina: (stamina: number) => void;
  private onUpdateScore: (score: number) => void;
  private onGameOver: (score: number) => void;
  private onLocationChange: (isInTavern: boolean) => void;
  
  constructor() {
    console.log("📊 [StateManager] Initializing...");
    
    // Initialize default callbacks
    this.onUpdateHealth = () => {};
    this.onUpdateGold = () => {};
    this.onUpdateStamina = () => {};
    this.onUpdateScore = () => {};
    this.onGameOver = () => {};
    this.onLocationChange = () => {};
    
    // Initialize game state
    this.gameState = {
      isPlaying: false,
      isPaused: false,
      isGameOver: false,
      currentLevel: 'tavern',
      score: 0,
      timeElapsed: 0
    };
    
    console.log("📊 [StateManager] Initialized successfully");
  }
  
  public start(): void {
    console.log("📊 [StateManager] Starting game...");
    try {
      this.gameState.isPlaying = true;
      this.gameState.isPaused = false;
      this.gameState.isGameOver = false;
      console.log("📊 [StateManager] Game started successfully");
    } catch (error) {
      console.error("📊 [StateManager] Error starting game:", error);
      // Continue anyway to prevent blocking
      this.gameState.isPlaying = true;
      this.gameState.isPaused = false;
      this.gameState.isGameOver = false;
    }
  }
  
  public pause(): void {
    if (!this.gameState.isPlaying) return;
    this.gameState.isPaused = !this.gameState.isPaused;
    console.log("📊 [StateManager] Game paused:", this.gameState.isPaused);
  }
  
  public restart(): void {
    console.log("📊 [StateManager] Restarting game...");
    try {
      this.gameState.isGameOver = false;
      this.gameState.isPaused = false;
      this.gameState.timeElapsed = 0;
      this.gameState.score = 0;
      this.totalElapsedTime = 0;
      console.log("📊 [StateManager] Game restarted successfully");
    } catch (error) {
      console.error("📊 [StateManager] Error restarting game:", error);
      // Continue anyway
      this.gameState.isGameOver = false;
      this.gameState.isPaused = false;
      this.gameState.timeElapsed = 0;
      this.gameState.score = 0;
      this.totalElapsedTime = 0;
    }
  }
  
  public stop(): void {
    console.log("📊 [StateManager] Stopping game...");
    this.gameState.isPlaying = false;
  }
  
  public update(deltaTime: number): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;
    
    try {
      this.totalElapsedTime += deltaTime;
      this.gameState.timeElapsed = this.totalElapsedTime;
    } catch (error) {
      console.error("📊 [StateManager] Error updating state:", error);
      // Continue silently to prevent blocking game loop
    }
  }
  
  public setGameOver(score: number): void {
    try {
      if (!this.gameState.isGameOver) {
        this.gameState.isGameOver = true;
        this.gameState.isPaused = true;
        this.onGameOver(score);
      }
    } catch (error) {
      console.error("📊 [StateManager] Error setting game over:", error);
      // Set game over anyway
      this.gameState.isGameOver = true;
      this.gameState.isPaused = true;
    }
  }
  
  public updateLocationState(isInTavern: boolean): void {
    try {
      this.onLocationChange(isInTavern);
    } catch (error) {
      console.error("📊 [StateManager] Error updating location state:", error);
      // Continue silently
    }
  }
  
  // Callback setters
  public setOnUpdateHealth(callback: (health: number) => void): void {
    this.onUpdateHealth = callback;
  }
  
  public setOnUpdateGold(callback: (gold: number) => void): void {
    this.onUpdateGold = callback;
  }
  
  public setOnUpdateStamina(callback: (stamina: number) => void): void {
    this.onUpdateStamina = callback;
  }
  
  public setOnUpdateScore(callback: (score: number) => void): void {
    this.onUpdateScore = callback;
  }
  
  public setOnGameOver(callback: (score: number) => void): void {
    this.onGameOver = callback;
  }
  
  public setOnLocationChange(callback: (isInTavern: boolean) => void): void {
    this.onLocationChange = callback;
  }
  
  // State getters
  public getGameState(): GameState {
    return { ...this.gameState };
  }
  
  public isPlaying(): boolean {
    return this.gameState.isPlaying;
  }
  
  public isPaused(): boolean {
    return this.gameState.isPaused;
  }
  
  public isGameOver(): boolean {
    return this.gameState.isGameOver;
  }
  
  public getScore(): number {
    return this.gameState.score;
  }
  
  public dispose(): void {
    console.log("📊 [StateManager] Disposing...");
    this.gameState.isPlaying = false;
  }
}
