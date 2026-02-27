import { NextRequest, NextResponse } from 'next/server';
import { completeTask } from '@/lib/grok-store';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { taskId, error, type, dataBase64 } = body;

        if (!taskId) {
            return NextResponse.json(
                { success: false, error: 'Missing taskId' },
                { status: 400, headers: corsHeaders() }
            );
        }

        if (error) {
            completeTask(taskId, { type: type || 'image', error });
            return NextResponse.json(
                { success: true, message: 'Task marked as failed' },
                { headers: corsHeaders() }
            );
        }

        if (!dataBase64) {
            completeTask(taskId, { type: type || 'image', error: 'No data received' });
            return NextResponse.json(
                { success: false, error: 'No dataBase64' },
                { status: 400, headers: corsHeaders() }
            );
        }

        const OUTPUT_DIR = path.join(process.cwd(), 'output');
        await fs.mkdir(OUTPUT_DIR, { recursive: true }).catch(() => { });

        let finalPath = '';

        // Case 1: Extension sent a native Windows download path
        if (typeof dataBase64 === 'string' && !dataBase64.startsWith('data:') && dataBase64.length < 500) {
            let wslPath = dataBase64.replace(/\\/g, '/');

            // Handle standard C:/ paths
            wslPath = wslPath.replace(/^([a-zA-Z]):\//, (_: string, p1: string) => `/mnt/${p1.toLowerCase()}/`);

            // Handle \\wsl$\Ubuntu shares (Chrome often reports this as //wsl$/Ubuntu)
            wslPath = wslPath.replace(/^\/?\/?wsl\$\/Ubuntu\//i, '/');

            // If the user's Chrome is running inside WSL with a native path, we do nothing.

            const ext = type === 'video' ? 'mp4' : 'png';
            const filename = `grok_${uuidv4()}.${ext}`;
            finalPath = path.join(OUTPUT_DIR, filename);

            console.log(`[Grok Bridge] Copying native file: ${wslPath} → ${finalPath}`);
            await fs.copyFile(wslPath, finalPath);
        } else {
            // Case 2: Base64 blob
            const ext = type === 'video' ? 'mp4' : 'png';
            const filename = `grok_${uuidv4()}.${ext}`;
            finalPath = path.join(OUTPUT_DIR, filename);
            const base64Clean = dataBase64.replace(/^data:[^;]+;base64,/, '');
            await fs.writeFile(finalPath, Buffer.from(base64Clean, 'base64'));
        }

        completeTask(taskId, { type: type || 'image', dataBase64: finalPath });

        return NextResponse.json(
            { success: true, message: 'Task completed', path: finalPath },
            { headers: corsHeaders() }
        );
    } catch (err: unknown) {
        console.error('[Grok Bridge] complete error:', err);
        return NextResponse.json(
            { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
            { status: 500, headers: corsHeaders() }
        );
    }
}
