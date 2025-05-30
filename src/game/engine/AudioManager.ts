
import * as THREE from 'three';

export enum SoundCategory {
  MUSIC = 'music',
  SFX = 'sfx',
  VOICE = 'voice',
  AMBIENT = 'ambient'
}

interface Sound {
  id: string;
  audio: THREE.Audio | THREE.PositionalAudio;
  buffer: THREE.AudioBuffer;
  category: SoundCategory;
  volume: number;
  isLooping: boolean;
  isPositional: boolean;
  isPaused: boolean;
  fadeInTime?: number;
  fadeOutTime?: number;
}

export class AudioManager {
  private listener: THREE.AudioListener;
  private sounds: Map<string, Sound> = new Map();
  private categories: Map<SoundCategory, number> = new Map();
  private masterVolume: number = 1.0;
  private loader: THREE.AudioLoader;
  private enabled: boolean = true;
  private camera: THREE.Camera;
  private scene: THREE.Scene;
  
  constructor(camera: THREE.Camera, scene: THREE.Scene) {
    this.camera = camera;
    this.scene = scene;
    this.listener = new THREE.AudioListener();
    this.camera.add(this.listener);
    this.loader = new THREE.AudioLoader();
    
    // Initialize volume for each category
    this.categories.set(SoundCategory.MUSIC, 0.5);
    this.categories.set(SoundCategory.SFX, 0.8);
    this.categories.set(SoundCategory.VOICE, 1.0);
    this.categories.set(SoundCategory.AMBIENT, 0.3);
    
    // Check if audio is supported
    if (this.listener.context.state === 'suspended') {
      this.enabled = false;
      console.warn('AudioContext is suspended. Audio playback may require user interaction.');
    }
    
    console.log('Audio Manager initialized with advanced features');
  }
  
  public loadSound(url: string, id: string, category: SoundCategory = SoundCategory.SFX): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.enabled) {
        resolve();
        return;
      }
      
      this.loader.load(
        url,
        (buffer) => {
          const audio = new THREE.Audio(this.listener);
          audio.setBuffer(buffer);
          audio.setVolume(this.categories.get(category)! * this.masterVolume);
          
          this.sounds.set(id, {
            id,
            audio,
            buffer,
            category,
            volume: 1.0,
            isLooping: false,
            isPositional: false,
            isPaused: false
          });
          
          resolve();
        },
        undefined, // onProgress callback not needed
        (error) => {
          console.error(`Error loading sound ${id}:`, error);
          reject(error);
        }
      );
    });
  }
  
  public loadPositionalSound(url: string, id: string, position: THREE.Vector3, category: SoundCategory = SoundCategory.SFX, refDistance: number = 5, maxDistance: number = 100): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.enabled) {
        resolve();
        return;
      }
      
      this.loader.load(
        url,
        (buffer) => {
          const audio = new THREE.PositionalAudio(this.listener);
          audio.setBuffer(buffer);
          audio.setRefDistance(refDistance);
          audio.setMaxDistance(maxDistance);
          audio.setVolume(this.categories.get(category)! * this.masterVolume);
          
          // Create a dummy object to hold the positional audio
          const dummyObject = new THREE.Object3D();
          dummyObject.position.copy(position);
          dummyObject.add(audio);
          this.scene.add(dummyObject);
          
          this.sounds.set(id, {
            id,
            audio,
            buffer,
            category,
            volume: 1.0,
            isLooping: false,
            isPositional: true,
            isPaused: false
          });
          
          resolve();
        },
        undefined, // onProgress callback not needed
        (error) => {
          console.error(`Error loading positional sound ${id}:`, error);
          reject(error);
        }
      );
    });
  }
  
  public play(id: string, loop: boolean = false, fadeIn: number = 0): void {
    if (!this.enabled || !this.sounds.has(id)) return;
    
    const sound = this.sounds.get(id)!;
    
    if (sound.audio.isPlaying) {
      sound.audio.stop();
    }
    
    sound.isLooping = loop;
    sound.audio.setLoop(loop);
    
    if (fadeIn > 0) {
      sound.fadeInTime = fadeIn;
      sound.audio.setVolume(0);
      sound.audio.play();
      
      // Gradually increase volume
      const startVolume = 0;
      const targetVolume = sound.volume * this.categories.get(sound.category)! * this.masterVolume;
      const startTime = Date.now();
      
      const fadeAudio = () => {
        const currentTime = Date.now();
        const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
        
        if (elapsed < fadeIn) {
          const volume = startVolume + (targetVolume - startVolume) * (elapsed / fadeIn);
          sound.audio.setVolume(volume);
          requestAnimationFrame(fadeAudio);
        } else {
          sound.audio.setVolume(targetVolume);
          sound.fadeInTime = undefined;
        }
      };
      
      fadeAudio();
    } else {
      sound.audio.play();
    }
    
    sound.isPaused = false;
  }
  
  public stop(id: string, fadeOut: number = 0): void {
    if (!this.enabled || !this.sounds.has(id)) return;
    
    const sound = this.sounds.get(id)!;
    
    if (!sound.audio.isPlaying) return;
    
    if (fadeOut > 0) {
      sound.fadeOutTime = fadeOut;
      
      // Gradually decrease volume
      const startVolume = sound.audio.getVolume();
      const targetVolume = 0;
      const startTime = Date.now();
      
      const fadeAudio = () => {
        const currentTime = Date.now();
        const elapsed = (currentTime - startTime) / 1000; // Convert to seconds
        
        if (elapsed < fadeOut && sound.audio.isPlaying) {
          const volume = startVolume + (targetVolume - startVolume) * (elapsed / fadeOut);
          sound.audio.setVolume(volume);
          requestAnimationFrame(fadeAudio);
        } else {
          sound.audio.stop();
          sound.audio.setVolume(sound.volume * this.categories.get(sound.category)! * this.masterVolume);
          sound.fadeOutTime = undefined;
        }
      };
      
      fadeAudio();
    } else {
      sound.audio.stop();
    }
    
    sound.isPaused = false;
  }
  
  public pause(id: string): void {
    if (!this.enabled || !this.sounds.has(id)) return;
    
    const sound = this.sounds.get(id)!;
    
    if (sound.audio.isPlaying) {
      sound.audio.pause();
      sound.isPaused = true;
    }
  }
  
  public resume(id: string): void {
    if (!this.enabled || !this.sounds.has(id)) return;
    
    const sound = this.sounds.get(id)!;
    
    if (sound.isPaused) {
      sound.audio.play();
      sound.isPaused = false;
    }
  }
  
  public setVolume(id: string, volume: number): void {
    if (!this.enabled || !this.sounds.has(id)) return;
    
    const sound = this.sounds.get(id)!;
    sound.volume = Math.max(0, Math.min(1, volume));
    
    sound.audio.setVolume(sound.volume * this.categories.get(sound.category)! * this.masterVolume);
  }
  
  public setCategoryVolume(category: SoundCategory, volume: number): void {
    volume = Math.max(0, Math.min(1, volume));
    this.categories.set(category, volume);
    
    // Update volume for all sounds in this category
    this.sounds.forEach(sound => {
      if (sound.category === category) {
        sound.audio.setVolume(sound.volume * volume * this.masterVolume);
      }
    });
  }
  
  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Update volume for all sounds
    this.sounds.forEach(sound => {
      sound.audio.setVolume(sound.volume * this.categories.get(sound.category)! * this.masterVolume);
    });
  }
  
  public mute(): void {
    if (!this.enabled) return;
    
    // Store current master volume and set to 0
    this.masterVolume = 0;
    
    // Mute all sounds
    this.sounds.forEach(sound => {
      sound.audio.setVolume(0);
    });
  }
  
  public unmute(volume: number = 1.0): void {
    if (!this.enabled) return;
    
    // Restore master volume
    this.masterVolume = Math.max(0, Math.min(1, volume));
    
    // Update volume for all sounds
    this.sounds.forEach(sound => {
      sound.audio.setVolume(sound.volume * this.categories.get(sound.category)! * this.masterVolume);
    });
  }
  
  public updatePosition(id: string, position: THREE.Vector3): void {
    if (!this.enabled || !this.sounds.has(id)) return;
    
    const sound = this.sounds.get(id)!;
    
    if (sound.isPositional) {
      const posAudio = sound.audio as THREE.PositionalAudio;
      posAudio.parent!.position.copy(position);
    }
  }
  
  public isPlaying(id: string): boolean {
    if (!this.enabled || !this.sounds.has(id)) return false;
    
    return this.sounds.get(id)!.audio.isPlaying;
  }
  
  public preloadCommonSounds(): void {
    // Preload common game sounds
    const soundsToLoad = [
      { url: '/sounds/sword_swing.mp3', id: 'sword_swing', category: SoundCategory.SFX },
      { url: '/sounds/sword_hit.mp3', id: 'sword_hit', category: SoundCategory.SFX },
      { url: '/sounds/player_hurt.mp3', id: 'player_hurt', category: SoundCategory.SFX },
      { url: '/sounds/enemy_hurt.mp3', id: 'enemy_hurt', category: SoundCategory.SFX },
      { url: '/sounds/enemy_death.mp3', id: 'enemy_death', category: SoundCategory.SFX },
      { url: '/sounds/gold_pickup.mp3', id: 'gold_pickup', category: SoundCategory.SFX },
      { url: '/sounds/footstep.mp3', id: 'footstep', category: SoundCategory.SFX },
      { url: '/sounds/tavern_ambience.mp3', id: 'tavern_ambience', category: SoundCategory.AMBIENT },
      { url: '/sounds/forest_ambience.mp3', id: 'forest_ambience', category: SoundCategory.AMBIENT },
      { url: '/sounds/game_music.mp3', id: 'game_music', category: SoundCategory.MUSIC }
    ];
    
    soundsToLoad.forEach(sound => {
      this.loadSound(sound.url, sound.id, sound.category)
        .catch(error => console.warn(`Failed to preload sound ${sound.id}:`, error));
    });
  }
  
  public update(): void {
    if (!this.enabled) return;
    
    // Update positional audio - nothing to do here as Three.js handles it
  }
  
  public enable(): void {
    if (this.listener.context.state === 'suspended') {
      this.listener.context.resume().then(() => {
        this.enabled = true;
        console.log('AudioContext resumed successfully');
      }).catch(error => {
        console.error('Failed to resume AudioContext:', error);
      });
    } else {
      this.enabled = true;
    }
  }
  
  public disable(): void {
    this.enabled = false;
    
    // Stop all playing sounds
    this.sounds.forEach(sound => {
      if (sound.audio.isPlaying) {
        sound.audio.stop();
      }
    });
  }
  
  public isEnabled(): boolean {
    return this.enabled;
  }
  
  // Legacy methods for backward compatibility
  public playSound(soundName: string): void {
    console.log(`Playing sound: ${soundName}`);
    this.play(soundName);
  }

  public playBackgroundMusic(musicName: string): void {
    console.log(`Playing background music: ${musicName}`);
    this.play(musicName, true);
  }

  public toggleMute(): void {
    if (this.masterVolume > 0) {
      this.mute();
      console.log('Audio disabled');
    } else {
      this.unmute();
      console.log('Audio enabled');
    }
  }
  
  public dispose(): void {
    // Stop and remove all sounds
    this.sounds.forEach(sound => {
      if (sound.audio.isPlaying) {
        sound.audio.stop();
      }
      
      if (sound.isPositional) {
        const posAudio = sound.audio as THREE.PositionalAudio;
        this.scene.remove(posAudio.parent!);
      }
      
      sound.audio.disconnect();
    });
    
    this.sounds.clear();
    
    // Remove listener from camera
    this.camera.remove(this.listener);
    
    // Close audio context if possible
    if (this.listener.context && typeof this.listener.context.close === 'function') {
      this.listener.context.close();
    }
  }
}
