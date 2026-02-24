import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import path from 'path';

const TEMPLATES_DIR = path.join(process.cwd(), 'fav-templates');

/**
 * GET /api/templates/load
 * Load a template from the fav-templates folder
 */
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ error: 'Filename required' }, { status: 400 });
        }

        const filepath = path.join(TEMPLATES_DIR, path.basename(filename));
        const content = await readFile(filepath, 'utf-8');
        const workflow = JSON.parse(content);

        return NextResponse.json({ success: true, workflow });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: 'Failed to load template' },
            { status: 500 }
        );
    }
}
