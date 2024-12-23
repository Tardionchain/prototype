interface Position {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  facingDir: number;
  targetDir: number;
  speed: number;
  targetSpeed: number;
  speedChangeInterval: number;
}

interface HistoryEntry {
  position: Position;
  timestamp: number;
  transaction?: string;
}

export class MovementStore {
  private position: Position | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private syncInProgress = false;
  private lastSyncTime = 0;
  private lastUpdateTime = 0;
  private retryCount = 0;
  private readonly MAX_RETRIES = 3;
  private readonly SYNC_INTERVAL = 500; // Less frequent syncs to reduce server load
  private readonly MIN_UPDATE_INTERVAL = 100; // Longer minimum interval between updates
  private readonly SYNC_TIMEOUT = 5000; // Increase timeout to 5 seconds
  private readonly RETRY_DELAY = 200; // Base delay for retries

  async updatePosition(newPosition: Position): Promise<void> {
    const now = Date.now();
    if (now - this.lastUpdateTime < this.MIN_UPDATE_INTERVAL) {
      return; // Debounce rapid updates
    }
    
    this.position = newPosition;
    this.lastUpdateTime = now;
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.SYNC_TIMEOUT);
      
      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          x: newPosition.x,
          y: newPosition.y,
          velocityX: newPosition.velocityX,
          velocityY: newPosition.velocityY
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      this.retryCount = 0; // Reset retry count on successful update
    } catch (error) {
      console.error('Failed to sync position:', error);
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Request timed out, retrying...');
      }
      
      if (this.retryCount < this.MAX_RETRIES) {
        this.retryCount++;
        const delay = this.RETRY_DELAY * Math.pow(2, this.retryCount);
        await new Promise(resolve => setTimeout(resolve, delay));
        await this.updatePosition(newPosition);
      }
    }
  }

  async getCurrentPosition(): Promise<Position | null> {
    if (!this.position || Date.now() - this.lastSyncTime > this.SYNC_INTERVAL) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.SYNC_TIMEOUT);
        
        const response = await fetch('/api/sync', {
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        if (data && typeof data.x === 'number' && typeof data.y === 'number') {
          this.position = {
            x: data.x,
            y: data.y,
            velocityX: data.velocityX || 0,
            velocityY: data.velocityY || 0,
            facingDir: data.facingDir || 0,
            targetDir: data.targetDir || 0,
            speed: data.speed || 0,
            targetSpeed: data.targetSpeed || 0,
            speedChangeInterval: data.speedChangeInterval || 0
          };
          this.lastSyncTime = Date.now();
        }
      } catch (error) {
        console.error('Failed to get current position:', error);
        if (error instanceof Error && error.name === 'AbortError') {
          console.warn('Request timed out, using last known position');
        }
        // Return last known position on error
        return this.position;
      }
    }
    return this.position;
  }

  setupSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    
    this.syncInterval = setInterval(async () => {
      if (this.syncInProgress) return;
      
      this.syncInProgress = true;
      try {
        await this.getCurrentPosition();
      } catch (error) {
        console.error('Error in sync interval:', error);
      } finally {
        this.syncInProgress = false;
      }
    }, this.SYNC_INTERVAL);
  }

  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const movementStore = new MovementStore(); 