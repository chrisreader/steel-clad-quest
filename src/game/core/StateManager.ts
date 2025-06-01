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
    this.gameState.isPlaying = true;
    this.gameState.isPaused = false;
    this.gameState.isGameOver = false;
  }
  
  public pause(): void {
    if (!this.gameState.isPlaying) return;
    this.gameState.isPaused = !this.gameState.isPaused;
    console.log("📊 [StateManager] Game paused:", this.gameState.isPaused);
  }
  
  public restart(): void {
    console.log("📊 [StateManager] Restarting game...");
    this.gameState.isGameOver = false;
    this.gameState.isPaused = false;
    this.gameState.timeElapsed = 0;
    this.gameState.score = 0;
    this.totalElapsedTime = 0;
  }
  
  public stop(): void {
    console.log("📊 [StateManager] Stopping game...");
    this.gameState.isPlaying = false;
  }
  
  public update(deltaTime: number): void {
    if (!this.gameState.isPlaying || this.gameState.isPaused) return;
    
    this.totalElapsedTime += deltaTime;
    this.gameState.timeElapsed = this.totalElapsedTime;
  }
  
  public setGameOver(score: number): void {
    if (!this.gameState.isGameOver) {
      this.gameState.isGameOver = true;
      this.gameState.isPaused = true;
      this.onGameOver(score);
    }
  }
  
  public updateLocationState(isInTavern: boolean): void {
    this.onLocationChange(isInTavern);
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
