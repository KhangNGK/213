import { SyncStatus, Collaborator } from '../types';

/**
 * 🧪 REALTIME COLLAB SIMULATION (Yjs Architecture)
 * In a real app, this would wrap `y-websocket` or `Hocuspocus`.
 */

class MockRealtimeService {
  private statusListeners: ((status: SyncStatus) => void)[] = [];
  private presenceListeners: ((users: Collaborator[]) => void)[] = [];
  private currentStatus: SyncStatus = 'synced';
  
  // Simulated Peers
  private mockPeers: Collaborator[] = [
    { id: 'u2', email: 'jane@studio.com', name: 'Jane Editor', role: 'editor', color: '#FF5D5D', isActive: true, avatarUrl: 'https://ui-avatars.com/api/?name=Jane+Editor&background=FF5D5D&color=fff' },
    { id: 'u3', email: 'alex@studio.com', name: 'Alex Trans', role: 'translator', color: '#5B8CFF', isActive: true, avatarUrl: 'https://ui-avatars.com/api/?name=Alex+Trans&background=5B8CFF&color=fff' }
  ];

  constructor() {
    // Simulate random sync events
    setInterval(() => {
      this.currentStatus = 'syncing';
      this.notifyStatus();
      setTimeout(() => {
        this.currentStatus = 'synced';
        this.notifyStatus();
      }, 800);
    }, 10000);
  }

  public subscribeStatus(callback: (status: SyncStatus) => void) {
    this.statusListeners.push(callback);
    callback(this.currentStatus);
    return () => {
      this.statusListeners = this.statusListeners.filter(cb => cb !== callback);
    };
  }

  public subscribePresence(callback: (users: Collaborator[]) => void) {
    this.presenceListeners.push(callback);
    callback(this.mockPeers);
    return () => {
      this.presenceListeners = this.presenceListeners.filter(cb => cb !== callback);
    };
  }

  public notifyStatus() {
    this.statusListeners.forEach(cb => cb(this.currentStatus));
  }

  public triggerManualSync() {
    this.currentStatus = 'syncing';
    this.notifyStatus();
    return new Promise(resolve => {
        setTimeout(() => {
            this.currentStatus = 'synced';
            this.notifyStatus();
            resolve(true);
        }, 1200);
    });
  }
}

export const realtime = new MockRealtimeService();