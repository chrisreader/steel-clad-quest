
import { AudioManager } from '../../../engine/AudioManager';
import { FireSoundConfig } from '../types/FireTypes';

export class FireSoundManager {
  private audioManager: AudioManager;
  private config: FireSoundConfig;
  private soundId: string | null = null;
  private isPlaying: boolean = false;

  constructor(audioManager: AudioManager, config: FireSoundConfig) {
    this.audioManager = audioManager;
    this.config = config;
  }

  public start(): void {
    if (!this.isPlaying) {
      // Use ambient fire crackling sound
      this.soundId = 'fire_crackling';
      this.isPlaying = true;
      // Audio playback would be implemented here when audio files are available
    }
  }

  public stop(): void {
    if (this.isPlaying && this.soundId) {
      this.isPlaying = false;
      // Audio stopping would be implemented here when audio files are available
    }
  }

  public updateVolume(volume: number): void {
    this.config.volume = volume;
    // Volume updates would be implemented here when audio system supports it
  }

  public dispose(): void {
    this.stop();
    this.soundId = null;
  }
}
