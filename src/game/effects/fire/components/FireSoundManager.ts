
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
      
      // Note: This would need actual audio files in the audio manager
      // For now, we'll just log the intention
      console.log('🔥 Fire crackling sound started');
      this.isPlaying = true;
      
      // TODO: Implement actual audio playback when audio files are available
      // this.audioManager.playAmbient(this.soundId, this.config.volume, this.config.loop);
    }
  }

  public stop(): void {
    if (this.isPlaying && this.soundId) {
      console.log('🔥 Fire crackling sound stopped');
      this.isPlaying = false;
      
      // TODO: Implement actual audio stopping when audio files are available
      // this.audioManager.stopAmbient(this.soundId);
    }
  }

  public updateVolume(volume: number): void {
    this.config.volume = volume;
    if (this.isPlaying && this.soundId) {
      // TODO: Update volume when audio system supports it
      // this.audioManager.setVolume(this.soundId, volume);
    }
  }

  public dispose(): void {
    this.stop();
    this.soundId = null;
  }
}
