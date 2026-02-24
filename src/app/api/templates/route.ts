import { NextResponse } from 'next/server';
import { readdir, stat, readFile } from 'fs/promises';
import path from 'path';
import { mkdir } from 'fs/promises';

const TEMPLATES_DIR = path.join(process.cwd(), 'fav-templates');

// Ensure directory exists
async function ensureDir() {
    try {
        await mkdir(TEMPLATES_DIR, { recursive: true });
    } catch (error) {
        // Ignore if exists
    }
}

export async function GET() {
    try {
        await ensureDir();
        const files = await readdir(TEMPLATES_DIR);

        const templates = await Promise.all(
            files
                .filter((f) => f.endsWith('.json'))
                .map(async (filename) => {
                    const filepath = path.join(TEMPLATES_DIR, filename);
                    const stats = await stat(filepath);

                    let name = filename.replace('.json', '');
                    let description = 'A custom user-uploaded template';
                    let tags = ['Uploaded'];
                    let iconType = 'file';

                    try {
                        const content = await readFile(filepath, 'utf-8');
                        const data = JSON.parse(content);
                        if (data.name) name = data.name;
                        if (data.description) description = data.description;
                        if (data.tags) tags = Array.isArray(data.tags) ? data.tags : [data.tags];
                        if (data.iconType) iconType = data.iconType;
                    } catch {
                        // Ignore parse errors
                    }

                    return {
                        id: filename,
                        filename,
                        title: name,
                        description,
                        tags,
                        iconType,
                        modified: stats.mtime,
                    };
                })
        );

        return NextResponse.json({ success: true, templates });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to list templates' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        await ensureDir();
        const formData = await request.formData();
        const file = formData.get('file') as File;

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const safeFilename = file.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
        const filepath = path.join(TEMPLATES_DIR, safeFilename);

        await require('fs/promises').writeFile(filepath, buffer);

        return NextResponse.json({ success: true, message: 'Template uploaded' });
    } catch (error) {
        return NextResponse.json({ success: false, error: 'Failed to upload template' }, { status: 500 });
    }
}
