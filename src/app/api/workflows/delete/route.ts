import { NextRequest, NextResponse } from 'next/server';
import { unlink } from 'fs/promises';
import path from 'path';
import { FOLDERS } from '@/lib/tile-executor';

/**
 * DELETE /api/workflows/delete
 * Delete a workflow from the workflows folder
 */
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const filename = searchParams.get('filename');

        if (!filename) {
            return NextResponse.json({ error: 'Filename required' }, { status: 400 });
        }

        const filepath = path.join(FOLDERS.WORKFLOWS, path.basename(filename));
        await unlink(filepath);

        return NextResponse.json({ success: true, message: `Workflow deleted` });
    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
