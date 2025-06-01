
import * as THREE from 'three';

export enum SoundCategory {
  SFX = 'sfx',
  MUSIC = 'music',
  AMBIENT = 'ambient',
  UI = 'ui'
}

interface SoundConfig {
  buffer: AudioBuffer;
  category: SoundCategory;
  volume: number;
  loop: boolean;
}

export class AudioManager {
  private audioContext: AudioContext;
  private listener: THREE.AudioListener;
  private sounds: Map<string, SoundConfig> = new Map();
  private playingSounds: Map<string, THREE.Audio> = new Map();
  private categoryVolumes: Map<SoundCategory, number> = new Map();
  private masterVolume: number = 1.0;

  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    
    // Initialize category volumes
    this.categoryVolumes.set(SoundCategory.SFX, 0.7);
    this.categoryVolumes.set(SoundCategory.MUSIC, 0.5);
    this.categoryVolumes.set(SoundCategory.AMBIENT, 0.6);
    this.categoryVolumes.set(SoundCategory.UI, 0.8);
  }

  public async loadSound(url: string, id: string, category: SoundCategory = SoundCategory.SFX): Promise<void> {
    try {
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.sounds.set(id, {
        buffer: audioBuffer,
        category,
        volume: 1.0,
        loop: false
      });
      
      console.log(`🔊 [AudioManager] Loaded sound: ${id}`);
    } catch (error) {
      console.warn(`🔊 [AudioManager] Failed to load sound ${id}:`, error);
    }
  }

  public play(soundId: string, loop: boolean = false): THREE.Audio | null {
    const soundConfig = this.sounds.get(soundId);
    if (!soundConfig) {
      console.warn(`🔊 [AudioManager] Sound not found: ${soundId}`);
      return null;
    }

    try {
      // Stop existing instance if playing
      if (this.playingSounds.has(soundId)) {
        this.stop(soundId);
      }

      const audio = new THREE.Audio(this.listener);
      audio.setBuffer(soundConfig.buffer);
      audio.setLoop(loop);
      
      const categoryVolume = this.categoryVolumes.get(soundConfig.category) || 1.0;
      const finalVolume = this.masterVolume * categoryVolume * soundConfig.volume;
      audio.setVolume(finalVolume);
      
      audio.play();
      this.playingSounds.set(soundId, audio);
      
      // Remove from playing sounds when finished (if not looping)
      if (!loop) {
        setTimeout(() => {
          this.playingSounds.delete(soundId);
        }, (soundConfig.buffer.duration * 1000) + 100);
      }
      
      return audio;
    } catch (error) {
      console.warn(`🔊 [AudioManager] Failed to play sound ${soundId}:`, error);
      return null;
    }
  }

  public stop(soundId: string): void {
    const audio = this.playingSounds.get(soundId);
    if (audio && audio.isPlaying) {
      audio.stop();
      this.playingSounds.delete(soundId);
    }
  }

  public pause(soundId: string): void {
    const audio = this.playingSounds.get(soundId);
    if (audio && audio.isPlaying) {
      audio.pause();
    }
  }

  public resume(soundId: string): void {
    const audio = this.playingSounds.get(soundId);
    if (audio) {
      audio.play();
    }
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateAllVolumes();
  }

  public setCategoryVolume(category: SoundCategory, volume: number): void {
    this.categoryVolumes.set(category, Math.max(0, Math.min(1, volume)));
    this.updateAllVolumes();
  }

  private updateAllVolumes(): void {
    this.playingSounds.forEach((audio, soundId) => {
      const soundConfig = this.sounds.get(soundId);
      if (soundConfig) {
        const categoryVolume = this.categoryVolumes.get(soundConfig.category) || 1.0;
        const finalVolume = this.masterVolume * categoryVolume * soundConfig.volume;
        audio.setVolume(finalVolume);
      }
    });
  }

  public update(): void {
    // Update audio system if needed
  }

  public dispose(): void {
    // Stop all playing sounds
    this.playingSounds.forEach(audio => {
      if (audio.isPlaying) {
        audio.stop();
      }
    });
    this.playingSounds.clear();
    
    // Dispose of audio context
    if (this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
  }
}
