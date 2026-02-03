
import { supabase } from './supabaseClient';
import { Project, Chapter, GlossaryTerm, ChapterStatus } from '../types';

// Helper to validate UUIDs (kept for reference, but usage relaxed)
const isUuid = (id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
const isLocalId = (id: string) => id.startsWith('local-');

// Helper to detect if error relates to missing 'settings' column
const isSettingsColumnError = (error: any): boolean => {
    if (!error) return false;
    // Check codes: PGRST204 (Schema Cache), 42703 (Undefined Column)
    if (error.code === 'PGRST204' || error.code === '42703') return true;
    
    // Check message text
    const msg = (error.message || '').toLowerCase();
    return msg.includes('settings') && (msg.includes('column') || msg.includes('field') || msg.includes('find'));
};

const isAbortError = (e: any): boolean => {
    return e?.name === 'AbortError' || 
           (typeof e?.message === 'string' && e.message.toLowerCase().includes('abort'));
};

// Map DB snake_case to App camelCase
const mapProject = (row: any): Project => {
    // Default settings if row.settings is null (for backward compatibility)
    const defaultSettings = {
        allowPublicView: row.is_public || false,
        allowComments: false,
        requireApproval: false,
        allowEpubExport: true,
        allowContribution: false,
        showOnBulletin: false
    };

    return {
        id: row.id,
        workspaceId: row.workspace_id || 'default',
        title: row.title || 'Untitled',
        author: row.author || 'Unknown',
        description: row.description,
        genres: row.genres || [],
        sourceLang: row.source_lang || 'Unknown',
        targetLang: row.target_lang || 'English',
        coverImage: row.cover_image,
        stats: {
            totalChapters: row.total_chapters || 0,
            translatedChapters: row.translated_chapters || 0,
            glossaryTerms: 0, 
            characters: 0,
            completionPercent: row.total_chapters > 0 ? Math.round((row.translated_chapters || 0) / row.total_chapters * 100) : 0,
            views: row.views || 0,
            rating: row.rating || 0
        },
        syncStatus: 'synced',
        isPublic: row.is_public || false,
        // Merge DB settings with defaults to ensure all keys exist
        settings: { ...defaultSettings, ...(row.settings || {}) },
        updatedAt: row.updated_at || new Date().toISOString()
    };
};

const mapChapter = (row: any): Chapter => ({
    id: row.id,
    projectId: row.project_id,
    index: row.index || 0,
    titleOriginal: row.title_original || '',
    titleTranslated: row.title_translated || '',
    contentRaw: row.content_raw || '',
    contentTranslated: row.content_translated || '',
    summary: row.summary || '',
    status: row.status || 'raw',
    isDirty: false,
    version: row.version || 1,
    wordCount: (row.content_translated || '').split(/\s+/).length,
    updatedAt: row.updated_at || new Date().toISOString()
});

const mapGlossaryTerm = (row: any): GlossaryTerm => ({
    id: row.id,
    projectId: row.project_id,
    term: row.term,
    definition: row.definition,
});

export const dataService = {
    // STORAGE
    uploadCoverImage: async (file: File): Promise<{ url: string | null, error: string | null }> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { url: null, error: "Must be logged in to upload." };

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}/${Date.now()}.${fileExt}`; // Organize by User ID

            // Upload to 'covers' bucket
            const { error: uploadError } = await supabase.storage
                .from('covers')
                .upload(fileName, file);

            if (uploadError) {
                // Return descriptive error if bucket doesn't exist
                if (uploadError.message.includes('Bucket not found')) {
                    return { url: null, error: "Storage bucket 'covers' not found. Please create a public bucket named 'covers' in Supabase." };
                }
                throw uploadError;
            }

            // Get Public URL
            const { data } = supabase.storage.from('covers').getPublicUrl(fileName);
            return { url: data.publicUrl, error: null };
        } catch (e: any) {
            return { url: null, error: e.message };
        }
    },

    // PROJECTS (MY WORKSPACE)
    fetchProjects: async (): Promise<{ data: Project[], error: string | null }> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) return { data: [], error: null };

            // STRICT FILTER: Only fetch projects owned by the logged-in user
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('user_id', user.id) 
                .order('updated_at', { ascending: false });
            
            if (error) throw error;
            return { data: (data || []).map(mapProject), error: null };
        } catch (e: any) {
            if (!isAbortError(e)) {
                console.error('Supabase Fetch Error:', e);
            }
            return { data: [], error: isAbortError(e) ? null : (e.message || 'Failed to fetch projects') };
        }
    },
    
    // FORUM: Fetch Public Projects (Community)
    fetchPublicProjects: async (): Promise<{ data: Project[], error: string | null }> => {
        try {
            const { data, error } = await supabase
                .from('projects')
                .select('*')
                .eq('is_public', true) // Only public
                .order('updated_at', { ascending: false });
                
            if (error) throw error;
            return { data: (data || []).map(mapProject), error: null };
        } catch (e: any) {
            if (!isAbortError(e)) {
                console.error('Public Project Fetch Error:', e);
            }
            return { data: [], error: isAbortError(e) ? null : e.message };
        }
    },

    // READER: Increment View Count
    incrementProjectView: async (projectId: string): Promise<void> => {
        if (isLocalId(projectId)) return;
        try {
            // Call the Stored Procedure defined in SQL
            const { error } = await supabase.rpc('increment_project_view', { row_id: projectId });
            if (error) console.error("Failed to increment view:", error);
        } catch (e) {
            if (!isAbortError(e)) {
                console.error("View increment error:", e);
            }
        }
    },

    createProject: async (project: Partial<Project>): Promise<{ data: Project | null, error: string | null }> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            
            if (!user) {
                return { data: null, error: "You must be logged in to create a cloud project." };
            }

            const payload: any = {
                title: project.title,
                author: project.author,
                description: project.description,
                genres: project.genres,
                source_lang: project.sourceLang,
                target_lang: project.targetLang,
                cover_image: project.coverImage,
                is_public: project.isPublic,
                settings: project.settings, 
                user_id: user.id, 
                updated_at: new Date().toISOString()
            };

            let { data, error } = await supabase.from('projects').insert(payload).select().single();

            if (error && isSettingsColumnError(error)) {
                 console.warn("Retrying project creation without 'settings' column...");
                 delete payload.settings;
                 const retry = await supabase.from('projects').insert(payload).select().single();
                 data = retry.data;
                 error = retry.error;
            }

            if (error) throw error;
            return { data: mapProject(data), error: null };
        } catch (e: any) {
             return { data: null, error: e.message };
        }
    },

    updateProject: async (id: string, updates: Partial<Project> & { settings?: any }): Promise<{ error: string | null }> => {
        if (isLocalId(id)) return { error: null };

        try {
            const payload: any = {
                updated_at: new Date().toISOString()
            };

            if (updates.title !== undefined) payload.title = updates.title;
            if (updates.author !== undefined) payload.author = updates.author;
            if (updates.description !== undefined) payload.description = updates.description;
            if (updates.genres !== undefined) payload.genres = updates.genres;
            if (updates.coverImage !== undefined) payload.cover_image = updates.coverImage;
            
            if (updates.isPublic !== undefined) payload.is_public = updates.isPublic;
            if (updates.settings !== undefined) payload.settings = updates.settings;
            
            if (updates.stats) {
                payload.total_chapters = updates.stats.totalChapters;
                payload.translated_chapters = updates.stats.translatedChapters;
            }

            const { error } = await supabase.from('projects').update(payload).eq('id', id);

            if (error && isSettingsColumnError(error)) {
                console.warn("Supabase 'settings' column missing. Retrying update without settings...");
                delete payload.settings;
                const { error: retryError } = await supabase.from('projects').update(payload).eq('id', id);
                if (retryError) throw retryError;
                return { error: null };
            }

            if (error) throw error;
            return { error: null };
        } catch (e: any) {
            if (!isAbortError(e)) {
                console.error("Update Project Error:", e);
            }
            return { error: e.message };
        }
    },

    pushToCloud: async (localProject: Project, localChapters: Chapter[]): Promise<{ data: Project | null, error: string | null }> => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return { data: null, error: "Please login to push to cloud." };

            const projectPayload: any = {
                title: localProject.title,
                author: localProject.author,
                description: localProject.description,
                genres: localProject.genres,
                source_lang: localProject.sourceLang,
                target_lang: localProject.targetLang,
                cover_image: localProject.coverImage,
                is_public: localProject.isPublic,
                settings: localProject.settings,
                total_chapters: localChapters.length,
                translated_chapters: localChapters.filter(c => c.status === 'translated').length,
                user_id: user.id,
                updated_at: new Date().toISOString()
            };

            let cloudProject;
            
            let { data: insertedProj, error: projError } = await supabase
                .from('projects')
                .insert(projectPayload)
                .select()
                .single();

             if (projError && isSettingsColumnError(projError)) {
                 delete projectPayload.settings;
                 const retry = await supabase.from('projects').insert(projectPayload).select().single();
                 insertedProj = retry.data;
                 projError = retry.error;
             }

            if (projError) throw projError;
            cloudProject = insertedProj;

            if (localChapters.length > 0) {
                const chaptersPayload = localChapters.map(ch => ({
                    project_id: cloudProject.id, 
                    index: ch.index,
                    title_original: ch.titleOriginal,
                    title_translated: ch.titleTranslated,
                    content_raw: ch.contentRaw,
                    content_translated: ch.contentTranslated,
                    summary: ch.summary,
                    status: ch.status,
                    updated_at: new Date().toISOString()
                }));

                const { error: chapError } = await supabase
                    .from('chapters')
                    .insert(chaptersPayload);
                
                if (chapError && !isAbortError(chapError)) console.error("Chapter sync error:", chapError);
            }

            return { data: mapProject(cloudProject), error: null };
        } catch (e: any) {
            return { data: null, error: e.message };
        }
    },
    
    pullFromCloud: async (cloudProject: Project): Promise<{ chapters: Chapter[], error: string | null }> => {
        if (isLocalId(cloudProject.id)) return { chapters: [], error: "Not a cloud project" };
        
        try {
            const { data, error } = await supabase
                .from('chapters')
                .select('*')
                .eq('project_id', cloudProject.id)
                .order('index', { ascending: true });
                
            if (error) throw error;
            return { chapters: (data || []).map(mapChapter), error: null };
        } catch (e: any) {
            if (!isAbortError(e)) {
                console.error('Supabase Pull Error:', e);
            }
            return { chapters: [], error: isAbortError(e) ? null : e.message };
        }
    },

    fetchChapters: async (projectId: string): Promise<{ data: Chapter[], error: string | null }> => {
        if (isLocalId(projectId)) {
            return { data: [], error: null };
        }

        try {
            const { data, error } = await supabase
                .from('chapters')
                .select('*')
                .eq('project_id', projectId)
                .order('index', { ascending: true });

            if (error) throw error;
            return { data: (data || []).map(mapChapter), error: null };
        } catch (e: any) {
            if (!isAbortError(e)) {
                console.error('Supabase Chapter Fetch Error:', e);
            }
            return { data: [], error: isAbortError(e) ? null : e.message };
        }
    },
    
    fetchPublicChapters: async (projectId: string): Promise<{ data: Chapter[], error: string | null }> => {
        try {
            const { data, error } = await supabase
                .from('chapters')
                .select('id, project_id, index, title_original, title_translated, content_translated, content_raw, updated_at, status')
                .eq('project_id', projectId)
                .in('status', ['translated', 'approved', 'published']) 
                .order('index', { ascending: true });

            if (error) throw error;
            return { data: (data || []).map(mapChapter), error: null };
        } catch (e: any) {
            if (!isAbortError(e)) {
                console.error('Public Chapter Fetch Error:', e);
            }
            return { data: [], error: isAbortError(e) ? null : e.message };
        }
    },

    createChapter: async (chapter: Partial<Chapter>): Promise<{ data: Chapter | null, error: string | null }> => {
        if (!chapter.projectId || isLocalId(chapter.projectId)) {
             return { data: null, error: "Invalid Project ID for Cloud Storage" };
        }

        try {
             const payload = {
                project_id: chapter.projectId,
                index: chapter.index,
                title_original: chapter.titleOriginal,
                content_raw: chapter.contentRaw || '',
                status: 'raw',
                updated_at: new Date().toISOString()
            };
            const { data, error } = await supabase.from('chapters').insert(payload).select().single();
            if (error) throw error;
            return { data: mapChapter(data), error: null };
        } catch (e: any) {
             return { data: null, error: e.message };
        }
    },

    createChaptersBatch: async (projectId: string, chapters: Partial<Chapter>[]): Promise<{ count: number, error: string | null }> => {
        if (isLocalId(projectId)) return { count: 0, error: "Cannot batch insert to local project via API" };
        
        try {
            const payload = chapters.map(ch => ({
                project_id: projectId,
                index: ch.index,
                title_original: ch.titleOriginal || `Chapter ${ch.index}`,
                title_translated: ch.titleTranslated || '',
                content_raw: ch.contentRaw || '',
                content_translated: ch.contentTranslated || '',
                summary: ch.summary || '',
                status: ch.status || 'raw',
                updated_at: new Date().toISOString()
            }));

            const { error } = await supabase.from('chapters').insert(payload);
            if (error) throw error;
            return { count: payload.length, error: null };
        } catch (e: any) {
            return { count: 0, error: e.message };
        }
    },

    updateChapter: async (chapter: Chapter): Promise<{ error: string | null }> => {
        if (isLocalId(chapter.id)) {
            return { error: null };
        }

        try {
            const payload = {
                title_translated: chapter.titleTranslated,
                content_raw: chapter.contentRaw,
                content_translated: chapter.contentTranslated,
                summary: chapter.summary,
                status: chapter.status,
                updated_at: new Date().toISOString()
            };
            const { error } = await supabase.from('chapters').update(payload).eq('id', chapter.id);
            if (error) throw error;
            return { error: null };
        } catch (e: any) {
            return { error: e.message };
        }
    },

    batchUpdateChapters: async (updates: Partial<Chapter>[]): Promise<{ error: string | null }> => {
        try {
            const payload = updates.map(u => ({
                id: u.id,
                title_original: u.titleOriginal,
                title_translated: u.titleTranslated,
                content_raw: u.contentRaw,
                content_translated: u.contentTranslated,
                status: u.status,
                updated_at: new Date().toISOString()
            }));

            const dbPayload = payload.filter(p => !isLocalId(p.id!));
            
            if (dbPayload.length > 0) {
                 const { error } = await supabase.from('chapters').upsert(dbPayload);
                 if (error) throw error;
            }
            return { error: null };
        } catch (e: any) {
            return { error: e.message };
        }
    },
    
    deleteChapters: async (ids: string[]): Promise<{ error: string | null }> => {
        const dbIds = ids.filter(id => !isLocalId(id));
        if (dbIds.length === 0) return { error: null };

        try {
            const { error } = await supabase
                .from('chapters')
                .delete()
                .in('id', dbIds);
            if (error) throw error;
            return { error: null };
        } catch (e: any) {
            return { error: e.message };
        }
    },

    updateChapterStatus: async (chapterId: string, status: string): Promise<{ error: string | null }> => {
        if (isLocalId(chapterId)) return { error: null };
        try {
             const { error } = await supabase
                .from('chapters')
                .update({ 
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', chapterId);
             if (error) throw error;
             return { error: null };
        } catch(e: any) {
            return { error: e.message };
        }
    },

    saveAiTranslation: async (chapterId: string, contentTranslated: string, status: string = 'translated', currentVersion: number = 1): Promise<{ error: string | null }> => {
         if (isLocalId(chapterId)) return { error: null };
         try {
             const { error } = await supabase
                .from('chapters')
                .update({
                    content_translated: contentTranslated,
                    status: status,
                    version: currentVersion + 1, 
                    updated_at: new Date().toISOString()
                })
                .eq('id', chapterId);
            if (error) throw error;
            return { error: null };
         } catch(e: any) {
             return { error: e.message };
         }
    },

    fetchGlossary: async (projectId: string): Promise<{ data: GlossaryTerm[], error: string | null }> => {
        if (isLocalId(projectId)) return { data: [], error: null };

        try {
            const { data, error } = await supabase
                .from('glossary_terms')
                .select('*')
                .eq('project_id', projectId)
                .order('term', { ascending: true });
            if (error) throw error;
            return { data: (data || []).map(mapGlossaryTerm), error: null };
        } catch (e: any) {
            if (!isAbortError(e)) {
                console.error('Glossary Fetch Error:', e);
            }
            return { data: [], error: isAbortError(e) ? null : e.message };
        }
    },

    createGlossaryTerm: async (term: Partial<GlossaryTerm>): Promise<{ data: GlossaryTerm | null, error: string | null }> => {
        if (!term.projectId || isLocalId(term.projectId)) return { data: null, error: "Invalid Project ID" };
        
        try {
            const payload = {
                project_id: term.projectId,
                term: term.term,
                definition: term.definition,
                updated_at: new Date().toISOString()
            };
            const { data, error } = await supabase.from('glossary_terms').insert(payload).select().single();
            if (error) throw error;
            return { data: mapGlossaryTerm(data), error: null };
        } catch (e: any) {
            return { data: null, error: e.message };
        }
    },

    updateGlossaryTerm: async (term: GlossaryTerm): Promise<{ error: string | null }> => {
        if (isLocalId(term.id)) return { error: null };
        
        try {
            const { error } = await supabase
                .from('glossary_terms')
                .update({ 
                    term: term.term, 
                    definition: term.definition,
                    updated_at: new Date().toISOString()
                })
                .eq('id', term.id);
            if (error) throw error;
            return { error: null };
        } catch (e: any) {
            return { error: e.message };
        }
    },

    deleteGlossaryTerm: async (id: string): Promise<{ error: string | null }> => {
        if (isLocalId(id)) return { error: null };

        try {
            const { error } = await supabase.from('glossary_terms').delete().eq('id', id);
            if (error) throw error;
            return { error: null };
        } catch (e: any) {
            return { error: e.message };
        }
    }
};
