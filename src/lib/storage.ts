import { join } from 'path';
import { mkdir, writeFile, readFile, stat, unlink } from 'fs/promises';
import { createHash } from 'crypto';
import { prisma } from './prisma';

export type FileCategory =
    | 'profile_pictures'
    | 'documents'
    | 'publications'
    | 'proofs'
    | 'feedback'
    | 'think_tank'
    | 'general'
    | 'other';

interface PublicationMeta {
    journalId: string;
    volumeNumber?: number;
    issueNumber?: number;
    articleId?: string;
}

export interface SaveResult {
    url: string;
    path: string;
    storedName: string;
    checksum: string;
}

const MIME_TYPES: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    csv: 'text/csv', txt: 'text/plain', json: 'application/json',
    zip: 'application/zip', mp4: 'video/mp4', mp3: 'audio/mpeg',
};

export class StorageService {
    private static get rootPath(): string {
        return process.env.STORAGE_ROOT_PATH || join(process.cwd(), 'public', 'uploads');
    }

    private static isNAS(): boolean {
        return !!process.env.STORAGE_ROOT_PATH;
    }

    /** Resolve a sub-path for the given category */
    private static async getTargetDirectory(
        category: FileCategory,
        meta?: PublicationMeta
    ): Promise<string> {
        let subPath = '';

        switch (category) {
            case 'profile_pictures':
                subPath = join('users', 'profile_pictures');
                break;
            case 'documents':
                subPath = 'documents';
                break;
            case 'proofs':
                subPath = join('hr', 'proofs');
                break;
            case 'feedback':
                subPath = join('feedback');
                break;
            case 'think_tank':
                subPath = join('think-tank');
                break;
            case 'general':
                subPath = join('general');
                break;
            case 'publications':
                if (meta?.journalId) {
                    let volumeStr = meta.volumeNumber ? `v${meta.volumeNumber}` : 'volumes';
                    let issueStr  = meta.issueNumber  ? `i${meta.issueNumber}`  : 'issues';

                    if (meta.articleId && (!meta.volumeNumber || !meta.issueNumber)) {
                        const article = await prisma.article.findUnique({
                            where: { id: meta.articleId },
                            include: { issue: { include: { volume: true } } },
                        });
                        if (article?.issue) {
                            volumeStr = `v${article.issue.volume.volumeNumber}`;
                            issueStr  = `i${article.issue.issueNumber}`;
                        }
                    }
                    subPath = join('publications', meta.journalId, volumeStr, issueStr);
                } else {
                    subPath = 'publications';
                }
                break;
            default:
                subPath = String(category);
        }

        const fullPath = join(this.rootPath, subPath);
        await mkdir(fullPath, { recursive: true });
        return fullPath;
    }

    /** Compute MD5 hex checksum of a buffer */
    static computeChecksum(buffer: Buffer): string {
        return createHash('md5').update(buffer).digest('hex');
    }

    /**
     * Save a file to the storage system.
     * Returns url, absolute path, storedName, and MD5 checksum.
     */
    static async saveFile(
        file: Buffer | ArrayBuffer,
        originalFilename: string,
        category: FileCategory,
        meta?: PublicationMeta
    ): Promise<SaveResult> {
        const targetDir = await this.getTargetDirectory(category, meta);

        const ext       = originalFilename.split('.').pop()?.toLowerCase() || 'bin';
        const timestamp = Date.now();
        const random    = Math.round(Math.random() * 1e9);
        const storedName = `${category}-${timestamp}-${random}.${ext}`;
        const fullPath   = join(targetDir, storedName);

        const buffer   = Buffer.isBuffer(file) ? file : Buffer.from(file);
        const checksum = this.computeChecksum(buffer);

        await writeFile(fullPath, buffer);

        let url: string;
        if (this.isNAS()) {
            const rel = fullPath.replace(this.rootPath, '').replace(/\\/g, '/');
            url = `/api/files${rel.startsWith('/') ? '' : '/'}${rel}`;
        } else {
            const rel = fullPath.replace(join(process.cwd(), 'public'), '').replace(/\\/g, '/');
            url = rel.startsWith('/') ? rel : `/${rel}`;
        }

        return { url, path: fullPath, storedName, checksum };
    }

    /**
     * Save a file AND create a FileRecord in the database.
     */
    static async saveFileWithRecord(
        file: Buffer | ArrayBuffer,
        originalFilename: string,
        category: FileCategory,
        options?: {
            uploadedById?: string;
            context?: string;
            meta?: PublicationMeta;
        }
    ) {
        const result   = await this.saveFile(file, originalFilename, category, options?.meta);
        const buffer   = Buffer.isBuffer(file) ? file : Buffer.from(file);
        const ext      = originalFilename.split('.').pop()?.toLowerCase() || 'bin';
        const mimeType = MIME_TYPES[ext] ?? 'application/octet-stream';

        const record = await prisma.fileRecord.create({
            data: {
                filename:     originalFilename,
                storedName:   result.storedName,
                url:          result.url,
                path:         result.path,
                mimeType,
                size:         buffer.length,
                category:     String(category),
                context:      options?.context ?? null,
                checksum:     result.checksum,
                syncedAt:     new Date(),
                uploadedById: options?.uploadedById ?? null,
            },
        });

        return { ...result, record };
    }

    /**
     * Read a file from storage (used by the /api/files proxy).
     */
    static async readFile(relativePath: string): Promise<{ buffer: Buffer; contentType: string }> {
        const fullPath = join(this.rootPath, relativePath);

        if (!fullPath.startsWith(this.rootPath)) {
            throw new Error('Access denied');
        }

        const buffer = await readFile(fullPath);
        const ext    = relativePath.split('.').pop()?.toLowerCase();
        const contentType = (ext && MIME_TYPES[ext]) ? MIME_TYPES[ext] : 'application/octet-stream';

        return { buffer, contentType };
    }

    /** Get fs.stat info for a file */
    static async getFileInfo(relativePath: string) {
        const fullPath = join(this.rootPath, relativePath);
        if (!fullPath.startsWith(this.rootPath)) throw new Error('Access denied');
        return await stat(fullPath);
    }

    /**
     * Delete a file from disk by its URL.
     * Also removes the corresponding FileRecord from the DB if `recordId` is provided.
     */
    static async deleteFile(url: string, recordId?: string): Promise<void> {
        // Resolve disk path from URL
        let fullPath: string;
        if (url.startsWith('/api/files')) {
            const rel = url.replace('/api/files', '');
            fullPath = join(this.rootPath, rel);
        } else {
            // local /uploads/... URL
            const rel = url.replace(/^\/uploads/, '');
            fullPath  = join(process.cwd(), 'public', 'uploads', rel);
        }

        if (!fullPath.startsWith(this.rootPath) && !fullPath.startsWith(join(process.cwd(), 'public'))) {
            throw new Error('Access denied — path outside storage root');
        }

        try { await unlink(fullPath); } catch (e: any) {
            if (e.code !== 'ENOENT') throw e; // ignore "file not found"
        }

        if (recordId) {
            await prisma.fileRecord.delete({ where: { id: recordId } }).catch(() => {});
        }
    }

    /**
     * Move a file to a new category/meta and update its URL.
     */
    static async moveFile(
        oldUrl: string,
        newCategory: FileCategory,
        newMeta?: PublicationMeta
    ): Promise<string> {
        try {
            if (!oldUrl.startsWith('/api/files') && !oldUrl.startsWith('/uploads')) return oldUrl;

            const oldRelativePath = oldUrl.startsWith('/api/files')
                ? oldUrl.replace('/api/files', '')
                : oldUrl.replace('/uploads', '');
            const oldFullPath = join(this.rootPath, oldRelativePath);

            const targetDir   = await this.getTargetDirectory(newCategory, newMeta);
            const filename    = oldUrl.split('/').pop() || `moved-${Date.now()}`;
            const newFullPath = join(targetDir, filename);

            if (oldFullPath === newFullPath) return oldUrl;

            const buffer = await readFile(oldFullPath);
            await writeFile(newFullPath, buffer);
            try { await unlink(oldFullPath); } catch { /* ignore */ }

            let newUrl: string;
            if (this.isNAS()) {
                const rel = newFullPath.replace(this.rootPath, '').replace(/\\/g, '/');
                newUrl = `/api/files${rel.startsWith('/') ? '' : '/'}${rel}`;
            } else {
                const rel = newFullPath.replace(join(process.cwd(), 'public'), '').replace(/\\/g, '/');
                newUrl = rel.startsWith('/') ? rel : `/${rel}`;
            }

            return newUrl;
        } catch (error) {
            console.error('Storage moveFile error:', error);
            return oldUrl;
        }
    }

    /**
     * Sync scan: walk the storage root and reconcile with DB FileRecord table.
     * - Inserts DB records for files found on disk but not in DB
     * - Marks DB records as stale when disk file is missing
     * Returns a summary of changes.
     */
    static async syncScan(uploadedById?: string): Promise<{
        found: number; inserted: number; missing: number;
    }> {
        const { readdir } = await import('fs/promises');
        const { extname } = await import('path');

        const root = this.rootPath;
        let found = 0, inserted = 0, missing = 0;

        // Get all DB records
        const records = await prisma.fileRecord.findMany({ select: { id: true, path: true } });
        const pathSet = new Set(records.map(r => r.path));

        // Recursive directory walk
        const walk = async (dir: string) => {
            let entries: string[];
            try { entries = await readdir(dir); } catch { return; }
            for (const entry of entries) {
                const full = join(dir, entry);
                let s;
                try { s = await stat(full); } catch { continue; }
                if (s.isDirectory()) { await walk(full); continue; }

                found++;
                if (!pathSet.has(full)) {
                    // Unknown file — insert record
                    const ext       = extname(entry).slice(1).toLowerCase();
                    const mimeType  = MIME_TYPES[ext] ?? 'application/octet-stream';
                    const rel       = full.replace(root, '').replace(/\\/g, '/');
                    const url       = this.isNAS()
                        ? `/api/files${rel.startsWith('/') ? '' : '/'}${rel}`
                        : `/uploads${rel}`;

                    await prisma.fileRecord.create({
                        data: {
                            filename:     entry,
                            storedName:   entry,
                            url,
                            path:         full,
                            mimeType,
                            size:         s.size,
                            category:     'general',
                            syncedAt:     new Date(),
                            uploadedById: uploadedById ?? null,
                        },
                    }).catch(() => {}); // skip if duplicate
                    inserted++;
                }
            }
        };

        await walk(root);

        // Check which DB records have missing disk files
        for (const r of records) {
            try { await stat(r.path); } catch {
                missing++;
                // Optionally mark as stale — set syncedAt to null
                await prisma.fileRecord.update({
                    where: { id: r.id },
                    data: { syncedAt: null },
                }).catch(() => {});
            }
        }

        return { found, inserted, missing };
    }
}
