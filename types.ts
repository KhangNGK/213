import React from 'react';

// --- ENUMS & BASICS ---
export enum ModelType {
  GEMINI = 'GEMINI',
  GPT = 'GPT',
  CLAUDE = 'CLAUDE'
}

export type Role = 'owner' | 'editor' | 'contributor' | 'viewer' | 'translator';
export type ChapterStatus = 'raw' | 'draft' | 'translated' | 'approved' | 'published';
export type SyncStatus = 'local' | 'synced' | 'dirty' | 'conflict' | 'syncing';
export type PlanType = 'free' | 'pro' | 'studio';

// --- AI TYPES ---
export type AIActionType = 'TRANSLATE' | 'REWRITE' | 'SUMMARIZE' | 'PROOFREAD';
export type AITone = 'LITERARY' | 'CASUAL' | 'FORMAL';

// --- SAAS ENTITIES ---

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
}

export interface Workspace {
  id: string;
  title: string;
  storage: 'local' | 'cloud';
  isPublic: boolean;
  ownerId: string;
  createdAt: string;
}

export interface ProjectStats {
  totalChapters: number;
  translatedChapters: number;
  glossaryTerms: number;
  characters: number;
  completionPercent: number;
}

// "Project" in UI = "Novel"
export interface Project {
  id: string;
  workspaceId: string;
  title: string;
  author: string;
  coverImage?: string;
  genres: string[];
  description?: string;
  
  sourceLang: string;
  targetLang: string;
  
  // Stats (Computed/Derived in UI, cached in DB)
  stats: ProjectStats;
  
  // Historical Snapshot for Growth Calculation
  yesterdayStats?: ProjectStats;

  // Sync & State
  syncStatus: SyncStatus;
  lastSyncAt?: string;
  isPublic: boolean;
  
  // Feature Flags / Permissions
  settings: {
      allowPublicView: boolean;
      allowComments: boolean;
      requireApproval: boolean;
      allowEpubExport: boolean;
      allowContribution: boolean;
      showOnBulletin: boolean;
  };

  updatedAt: string;
}

export interface Chapter {
  id: string;
  projectId: string;
  index: number;
  titleOriginal: string;
  titleTranslated: string;
  contentRaw: string;
  contentTranslated: string;
  
  // Workflow State
  status: ChapterStatus;
  isDirty: boolean; // For local-first sync
  version: number;  // For conflict resolution
  
  // Metrics
  wordCount: number;
  commentsCount?: number;
  lastEditedBy?: string;
  updatedAt: string;
}

export interface GlossaryTerm {
  id: string;
  projectId: string;
  term: string;
  definition: string;
}

export interface Collaborator extends User {
  role: string;
  color: string;
  isActive: boolean;
}

export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  targetId?: string;
  timestamp: string;
  details?: string;
}

// UI State Helpers
export type ViewMode = 'LANDING' | 'WORKSPACE' | 'DASHBOARD';

// --- COMPONENT PROPS ---

export interface StepCardProps {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  glowColor: string;
  accentColor: string;
}

export interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  colorClass: string;
  iconColorClass: string;
}
