import * as THREE from 'three';

export enum SoundCategory {
  SFX = 'sfx',
  Music = 'music',
  Ambient = 'ambient'
}

export class AudioManager {
  private listener: THREE.AudioListener;
  private audioLoader: THREE.AudioLoader;
  private sounds: Map<string, THREE.Audio<GainNode>> = new Map();
  private categoryVolumes: Map<SoundCategory, number> = new Map([
    [SoundCategory.SFX, 0.5],
    [SoundCategory.Music, 0.25],
    [SoundCategory.Ambient, 0.3]
  ]);
  
  constructor(camera: THREE.PerspectiveCamera, scene: THREE.Scene) {
    console.log("🔊 [AudioManager] Initializing...");
    
    // Create audio listener and add to the camera
    this.listener = new THREE.AudioListener();
    camera.add(this.listener);
    
    // Add listener to the scene for spatial sound
    scene.add(this.listener);
    
    // Create audio loader
    this.audioLoader = new THREE.AudioLoader();
    
    console.log("🔊 [AudioManager] Initialized successfully");
  }
  
  public loadSound(url: string, id: string, category: SoundCategory = SoundCategory.SFX): Promise<void> {
    return new Promise((resolve, reject) => {
      this.audioLoader.load(
        url,
        (buffer) => {
          const sound = new THREE.Audio<GainNode>(this.listener);
          sound.setBuffer(buffer);
          sound.setLoop(false);
          sound.setVolume(this.categoryVolumes.get(category) || 0.5);
          this.sounds.set(id, sound);
          console.log(`🔊 [AudioManager] Sound loaded: ${id} from ${url}`);
          resolve();
        },
        undefined,
        (error) => {
          console.error(`🔊 [AudioManager] Error loading sound: ${id} from ${url}`, error);
          reject(error);
        }
      );
    });
  }
  
  public play(id: string, loop: boolean = false): void {
    const sound = this.sounds.get(id);
    if (!sound) {
      console.warn(`🔊 [AudioManager] Sound not found: ${id}`);
      return;
    }
    
    sound.stop(); // Stop previous instances
    sound.setLoop(loop);
    sound.play();
  }
  
  public pause(id: string): void {
    const sound = this.sounds.get(id);
    if (sound && sound.isPlaying) {
      sound.pause();
    }
  }
  
  public resume(id: string): void {
    const sound = this.sounds.get(id);
    if (sound && sound.isPaused) {
      sound.play();
    }
  }
  
  public stop(id: string): void {
    const sound = this.sounds.get(id);
    if (sound && sound.isPlaying) {
      sound.stop();
    }
  }
  
  public setVolume(id: string, volume: number): void {
    const sound = this.sounds.get(id);
    if (sound) {
      sound.setVolume(volume);
    }
  }
  
  public setCategoryVolume(category: SoundCategory, volume: number): void {
    this.categoryVolumes.set(category, volume);
    
    // Update volume for all sounds in this category
    this.sounds.forEach((sound, id) => {
      // @ts-ignore
      if (sound.buffer && sound.buffer.url && sound.buffer.url.includes(category)) {
        sound.setVolume(volume);
      }
    });
  }
  
  public getCategoryVolume(category: SoundCategory): number {
    return this.categoryVolumes.get(category) || 0.5;
  }
  
  public update(): void {
    // Update listener position (if needed)
    // this.listener.position.copy(this.camera.position);
    // this.listener.rotation.copy(this.camera.rotation);
  }
  
  public dispose(): void {
    console.log("🔊 [AudioManager] Disposing...");
    
    // Stop and dispose all sounds
    this.sounds.forEach((sound, id) => {
      sound.stop();
      sound.disconnect();
    });
    this.sounds.clear();
    
    // Dispose the listener
    this.listener.disconnect();
    
    console.log("🔊 [AudioManager] Disposed successfully");
  }
}

