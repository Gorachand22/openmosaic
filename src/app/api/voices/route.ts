import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const token = process.env.Z_AUDIO_TOKEN;
        const userId = process.env.Z_AUDIO_USER_ID;
        const apiBase = process.env.Z_AUDIO_API_BASE || 'https://audio.z.ai/api';

        if (!token) {
            return NextResponse.json({ success: false, error: 'Z_AUDIO_TOKEN not configured' }, { status: 500 });
        }

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json"
        };

        const results = {
            cloned: [] as any[],
            system: [] as any[]
        };

        // 1. Fetch System Voices
        try {
            const sysResponse = await fetch(`${apiBase}/v1/z-audio/voices/list_system`, { headers });
            if (sysResponse.ok) {
                const sysData = await sysResponse.json();
                const systemVoices = sysData.data || sysData.voices || [];
                results.system = systemVoices.map((v: any) => ({
                    value: v.voice_id,
                    label: v.voice_name || 'Unknown'
                }));
            }
        } catch (e) {
            console.error('Error fetching system voices:', e);
        }

        // 2. Fetch Cloned Voices
        if (userId) {
            try {
                const cloneResponse = await fetch(`${apiBase}/v1/z-audio/voices/list?user_id=${userId}&page=1&page_size=200`, { headers });
                if (cloneResponse.ok) {
                    const cloneData = await cloneResponse.json();
                    const clonedVoices = cloneData.data || [];
                    results.cloned = clonedVoices.map((v: any) => ({
                        value: v.voice_id,
                        label: v.voice_name || 'Unknown'
                    }));
                }
            } catch (e) {
                console.error('Error fetching cloned voices:', e);
            }
        }

        return NextResponse.json({ success: true, voices: results });
    } catch (error: any) {
        console.error('Voice list proxy failed:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
