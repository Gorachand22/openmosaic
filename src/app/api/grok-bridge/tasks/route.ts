import { NextRequest, NextResponse } from 'next/server';
import { claimTasks } from '@/lib/grok-store';

// Allow Chrome extension origins and localhost
function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
    };
}

export async function OPTIONS() {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

export async function GET(_req: NextRequest) {
    const tasks = claimTasks();
    return NextResponse.json({ success: true, tasks }, { headers: corsHeaders() });
}
