import { join } from 'path';
import { mkdir, writeFile, readFile, stat, unlink } from 'fs/promises';
import { prisma } from './prisma';

export type FileCategory = 'profile_pictures' | 'documents' | 'publications' | 'other' | 'proofs';

interface PublicationMeta {
    journalId: string;
    volumeNumber?: number;
    issueNumber?: number;
    articleId?: string;
}

export class StorageService {
    private static get rootPath(): string {
        // Use environment variable if set, otherwise default to public/uploads
        return process.env.STORAGE_ROOT_PATH || join(process.cwd(), 'public', 'uploads');
    }

    private static isNAS(): boolean {
        return !!process.env.STORAGE_ROOT_PATH;
    }

    /**
     * Get the directory for a specific category and metadata
     */
    private static async getTargetDirectory(category: FileCategory, meta?: PublicationMeta): Promise<string> {
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
            case 'publications':
                if (meta?.journalId) {
                    let volumeStr = meta.volumeNumber ? `v${meta.volumeNumber}` : 'volumes';
                    let issueStr = meta.issueNumber ? `i${meta.issueNumber}` : 'issues';

                    // If we only have articleId, try to fetch its journal/volume/issue
                    if (meta.articleId && (!meta.volumeNumber || !meta.issueNumber)) {
                        const article = await prisma.article.findUnique({
                            where: { id: meta.articleId },
                            include: {
                                issue: {
                                    include: {
                                        volume: true
                                    }
                                }
                            }
                        });
                        if (article?.issue) {
                            volumeStr = `v${article.issue.volume.volumeNumber}`;
                            issueStr = `i${article.issue.issueNumber}`;
                        }
                    }
                    subPath = join('publications', meta.journalId, volumeStr, issueStr);
                } else {
                    subPath = 'publications';
                }
                break;
            default:
                subPath = category;
        }

        const fullPath = join(this.rootPath, subPath);
        await mkdir(fullPath, { recursive: true });
        return fullPath;
    }

    /**
     * Save a file to the storage system
     */
    static async saveFile(
        file: Buffer | ArrayBuffer,
        originalFilename: string,
        category: FileCategory,
        meta?: PublicationMeta
    ): Promise<{ url: string; path: string }> {
        const targetDir = await this.getTargetDirectory(category, meta);

        // Generate a clean filename to avoid path injection
        const ext = originalFilename.split('.').pop() || 'bin';
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1e9);
        const filename = `${category}-${timestamp}-${random}.${ext}`;

        const fullPath = join(targetDir, filename);
        const buffer = Buffer.isBuffer(file) ? file : Buffer.from(file);

        await writeFile(fullPath, buffer);

        // Generate URL
        let url = '';
        if (this.isNAS()) {
            // Serve via proxy API if using NAS
            const relativePath = fullPath.replace(this.rootPath, '').replace(/\\/g, '/');
            url = `/api/files${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
        } else {
            // Serve via public folder if using local
            const relativePathFromPublic = fullPath.replace(join(process.cwd(), 'public'), '').replace(/\\/g, '/');
            url = relativePathFromPublic.startsWith('/') ? relativePathFromPublic : `/${relativePathFromPublic}`;
        }

        return { url, path: fullPath };
    }

    /**
     * Read a file from the storage system (used by the proxy API)
     */
    static async readFile(relativePath: string): Promise<{ buffer: Buffer; contentType: string }> {
        const fullPath = join(this.rootPath, relativePath);

        // Security check: ensure the path is within the root
        if (!fullPath.startsWith(this.rootPath)) {
            throw new Error('Access denied');
        }

        const buffer = await readFile(fullPath);

        // Basic content type detection
        const ext = relativePath.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';

        const mimeTypes: Record<string, string> = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv': 'text/csv',
            'txt': 'text/plain'
        };

        if (ext && mimeTypes[ext]) {
            contentType = mimeTypes[ext];
        }

        return { buffer, contentType };
    }

    /**
     * Get file info
     */
    static async getFileInfo(relativePath: string) {
        const fullPath = join(this.rootPath, relativePath);
        if (!fullPath.startsWith(this.rootPath)) {
            throw new Error('Access denied');
        }
        return await stat(fullPath);
    }

    /**
     * Move a file from one category/meta to another
     */
    static async moveFile(
        oldUrl: string,
        newCategory: FileCategory,
        newMeta?: PublicationMeta
    ): Promise<string> {
        try {
            // Only move if oldUrl is local/proxy
            if (!oldUrl.startsWith('/api/files') && !oldUrl.startsWith('/uploads')) {
                return oldUrl;
            }

            const oldRelativePath = oldUrl.startsWith('/api/files')
                ? oldUrl.replace('/api/files', '')
                : oldUrl.replace('/uploads', '');
            const oldFullPath = join(this.rootPath, oldRelativePath);

            const targetDir = await this.getTargetDirectory(newCategory, newMeta);
            const filename = oldUrl.split('/').pop() || `moved-${Date.now()}`;
            const newFullPath = join(targetDir, filename);

            if (oldFullPath === newFullPath) return oldUrl;

            // Use readFile and writeFile instead of rename to handle cross-device/NAS movements better
            const buffer = await readFile(oldFullPath);
            await writeFile(newFullPath, buffer);

            // Delete old file if successfully copied
            try {
                await unlink(oldFullPath);
            } catch (e) {
                console.warn('Could not delete old file after move:', e);
            }

            // Generate New URL
            let newUrl = '';
            if (this.isNAS()) {
                const relativePath = newFullPath.replace(this.rootPath, '').replace(/\\/g, '/');
                newUrl = `/api/files${relativePath.startsWith('/') ? '' : '/'}${relativePath}`;
            } else {
                const relativePathFromPublic = newFullPath.replace(join(process.cwd(), 'public'), '').replace(/\\/g, '/');
                newUrl = relativePathFromPublic.startsWith('/') ? relativePathFromPublic : `/${relativePathFromPublic}`;
            }

            return newUrl;
        } catch (error) {
            console.error('Error moving file:', error);
            return oldUrl;
        }
    }
}

