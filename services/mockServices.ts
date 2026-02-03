import { Project, SyncStatus, AuditLog, PlanType } from '../types';

// --- WORKFLOW ENGINE SIMULATION ---

export const workflowService = {
  // 1. SYNC WORKFLOW
  pushToCloud: async (project: Project): Promise<{ status: SyncStatus; timestamp: string }> => {
    console.log(`[Workflow] SYNC_PUSH_REQUESTED for Project: ${project.id}`);
    
    // Simulate Network Latency
    await new Promise(r => setTimeout(r, 1200));

    // Simulate Random Conflict (10% chance)
    const isConflict = Math.random() > 0.95; 
    
    if (isConflict) {
      console.warn('[Workflow] SYNC_CONFLICT_DETECTED');
      return { status: 'conflict', timestamp: new Date().toISOString() };
    }

    console.log('[Workflow] SYNC_SUCCESS');
    return { status: 'synced', timestamp: new Date().toISOString() };
  },

  // 2. EXPORT WORKFLOW
  buildEpub: async (project: Project): Promise<string> => {
    console.log(`[Workflow] EXPORT_EPUB_REQUESTED for ${project.title}`);
    await new Promise(r => setTimeout(r, 2000)); // Building...
    console.log('[Workflow] EPUB_GENERATED');
    return `https://mock-download.com/${project.id}.epub`;
  },

  // 3. PUBLISH WORKFLOW
  publishProject: async (project: Project, isPublic: boolean): Promise<boolean> => {
    console.log(`[Workflow] PUBLISH_STATE_CHANGE: ${isPublic ? 'PUBLIC' : 'PRIVATE'}`);
    await new Promise(r => setTimeout(r, 800));
    return true;
  },

  // 4. BULK CHAPTER ACTIONS
  translateChapters: async (chapterIds: string[]): Promise<string[]> => {
      console.log(`[Workflow] BATCH_TRANSLATE_REQUESTED: ${chapterIds.length} chapters`);
      // Simulate processing time per chapter
      await new Promise(r => setTimeout(r, 500 * chapterIds.length));
      return chapterIds;
  },

  publishChapters: async (chapterIds: string[]): Promise<string[]> => {
      console.log(`[Workflow] BATCH_PUBLISH_REQUESTED: ${chapterIds.length} chapters`);
      await new Promise(r => setTimeout(r, 800));
      return chapterIds;
  }
};

// --- SYNC ENGINE (Local-First Mock) ---
export const syncService = {
  pullFromCloud: async (userId: string): Promise<Project[]> => {
    await new Promise(r => setTimeout(r, 1000));
    return [
        {
            id: 'cloud-1',
            workspaceId: 'ws-1',
            title: 'The Regressed Demon Lord',
            author: 'Chun Ma',
            genres: ['Action', 'Martial Arts'],
            sourceLang: 'Korean',
            targetLang: 'English',
            syncStatus: 'synced',
            lastSyncAt: new Date().toISOString(),
            isPublic: true,
            // START EMPTY: Ensure cloud mock doesn't lie about content we don't have.
            stats: {
                totalChapters: 0,
                translatedChapters: 0,
                glossaryTerms: 45,
                characters: 12,
                completionPercent: 0
            },
            yesterdayStats: {
                totalChapters: 0,
                translatedChapters: 0,
                glossaryTerms: 40,
                characters: 12,
                completionPercent: 0
            },
            settings: {
                allowPublicView: true,
                allowComments: true,
                requireApproval: false,
                allowEpubExport: true,
                allowContribution: false,
                showOnBulletin: false
            },
            updatedAt: new Date().toISOString()
        }
    ];
  }
};