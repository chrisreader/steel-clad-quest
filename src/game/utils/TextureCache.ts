
import * as THREE from 'three';

export class TextureCache {
  private static instance: TextureCache;
  private textureCache: Map<string, THREE.Texture> = new Map();
  
  public static getInstance(): TextureCache {
    if (!TextureCache.instance) {
      TextureCache.instance = new TextureCache();
    }
    return TextureCache.instance;
  }
  
  public getTexture(key: string, generator: () => THREE.Texture): THREE.Texture {
    if (!this.textureCache.has(key)) {
      const texture = generator();
      this.textureCache.set(key, texture);
    }
    return this.textureCache.get(key)!.clone();
  }
  
  public clear(): void {
    this.textureCache.forEach(texture => texture.dispose());
    this.textureCache.clear();
  }
}
