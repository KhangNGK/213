import React from 'react';

export type StoryStatus = 'ongoing' | 'completed';
export type ChapterStatus = 'raw' | 'draft' | 'translated' | 'approved' | 'published';
export type ViewMode = 'LANDING' | 'WORKSPACE' | 'DASHBOARD' | 'EDITOR' | 'FORUM' | 'READER';
export type SyncStatus = 'synced' | 'syncing' | 'error' | 'local' | 'conflict';
export type PlanType = 'free' | 'pro' | 'enterprise';

export enum ModelType {
    GEMINI = 'gemini',
    GPT = 'gpt',
    CLAUDE = 'claude'
}

export interface GlossaryTerm {
    id: string;
    projectId: string;
    term: string;
    definition: string;
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

export interface ProjectSettings {
    allowPublicView: boolean;
    allowComments: boolean;
    requireApproval: boolean;
    allowEpubExport: boolean;
    allowContribution: boolean;
    showOnBulletin: boolean;
    autoNameAnalysis?: boolean;
    analysisTool?: string;
    translationTool?: string;
}

export interface Project {
    id: string;
    workspaceId: string;
    title: string;
    author: string;
    description?: string;
    genres: string[];
    sourceLang: string;
    targetLang: string;
    coverImage?: string;
    stats: ProjectStats;
    yesterdayStats?: ProjectStats;
    syncStatus: SyncStatus;
    lastSyncAt?: string;
    isPublic: boolean;
    settings: ProjectSettings;
    updatedAt: string;
}

export interface Chapter {
    id: string;
    // Reader Properties
    story_id?: string;
    chapter_number?: number;
    title?: string;
    content?: string;
    created_at?: string;

    // Workspace Properties
    projectId?: string;
    index?: number;
    titleOriginal?: string;
    titleTranslated?: string;
    contentRaw?: string;
    contentTranslated?: string;
    summary?: string;
    status?: ChapterStatus | string;
    isDirty?: boolean;
    version?: number;
    wordCount?: number;
    updatedAt?: string;
}

export interface Story {
  id: string;
  title: string;
  slug: string;
  author: string;
  description: string;
  cover_url: string;
  status: StoryStatus;
  total_chapters: number;
  views: number;
  created_at: string;
  updated_at: string;
  genres?: { name: string, slug: string }[];
}

export interface Genre {
  id: string;
  name: string;
  slug: string;
}

export interface SearchParams {
  q?: string;
  page?: string;
}

export interface Collaborator {
    id: string;
    email: string;
    name: string;
    role: 'owner' | 'editor' | 'translator' | 'viewer';
    color: string;
    isActive: boolean;
    avatarUrl?: string;
}

export interface AuditLog {
    id: string;
    action: string;
    details: string;
    timestamp: string;
    user: string;
}

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
