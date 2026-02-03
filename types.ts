
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
  views?: number;
  rating?: number;
}

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
  stats: ProjectStats;
  yesterdayStats?: ProjectStats;
  syncStatus: SyncStatus;
  lastSyncAt?: string;
  isPublic: boolean;
  settings: {
      allowPublicView: boolean;
      allowComments: boolean;
      requireApproval: boolean;
      allowEpubExport: boolean;
      allowContribution: boolean;
      showOnBulletin: boolean;
      // New QTranslate Settings
      autoLearnRules?: boolean;
      smartRuleSync?: boolean;
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
  summary?: string;
  status: ChapterStatus;
  isDirty: boolean;
  version: number;
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
  // Machine Learning Metadata
  usageCount?: number;
  contextHint?: string;
  sourceType?: 'manual' | 'ai_extracted' | 'rule_based';
  updatedAt?: string;
}

export interface Collaborator extends User {
  role: string;
  color: string;
  isActive: boolean;
}

export type ViewMode = 'LANDING' | 'WORKSPACE' | 'DASHBOARD' | 'FORUM' | 'READER' | 'EDITOR';

// Added missing interface for HowItWorks.tsx
export interface StepCardProps {
  step: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  glowColor: string;
  accentColor: string;
}

// Added missing interface for Features.tsx
export interface FeatureCardProps {
  icon: string;
  title: string;
  description: string;
  colorClass: string;
  iconColorClass: string;
}

// Added missing interface for mockServices.ts
export interface AuditLog {
  id: string;
  action: string;
  userId: string;
  timestamp: string;
  metadata?: any;
}
