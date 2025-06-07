
interface LogLevel {
  DEBUG: 0;
  INFO: 1;
  WARN: 2;
  ERROR: 3;
}

const LOG_LEVELS: LogLevel = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

class GameLogger {
  private static instance: GameLogger;
  private currentLevel: number = LOG_LEVELS.DEBUG;
  private isProduction: boolean = process.env.NODE_ENV === 'production';

  private constructor() {
    // Set production level to ERROR only
    if (this.isProduction) {
      this.currentLevel = LOG_LEVELS.ERROR;
    }
  }

  public static getInstance(): GameLogger {
    if (!GameLogger.instance) {
      GameLogger.instance = new GameLogger();
    }
    return GameLogger.instance;
  }

  public setLevel(level: keyof LogLevel): void {
    this.currentLevel = LOG_LEVELS[level];
  }

  public debug(module: string, message: string, ...args: any[]): void {
    if (this.currentLevel <= LOG_LEVELS.DEBUG) {
      console.log(`🔧 [${module}] ${message}`, ...args);
    }
  }

  public info(module: string, message: string, ...args: any[]): void {
    if (this.currentLevel <= LOG_LEVELS.INFO) {
      console.log(`ℹ️ [${module}] ${message}`, ...args);
    }
  }

  public warn(module: string, message: string, ...args: any[]): void {
    if (this.currentLevel <= LOG_LEVELS.WARN) {
      console.warn(`⚠️ [${module}] ${message}`, ...args);
    }
  }

  public error(module: string, message: string, ...args: any[]): void {
    if (this.currentLevel <= LOG_LEVELS.ERROR) {
      console.error(`❌ [${module}] ${message}`, ...args);
    }
  }

  public performance(module: string, operation: string, startTime: number): void {
    if (this.currentLevel <= LOG_LEVELS.DEBUG) {
      const duration = performance.now() - startTime;
      console.log(`⚡ [${module}] ${operation} took ${duration.toFixed(2)}ms`);
    }
  }
}

export const logger = GameLogger.getInstance();
