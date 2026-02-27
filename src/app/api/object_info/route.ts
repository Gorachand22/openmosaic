import { NextResponse } from 'next/server';
import { TILE_REGISTRY } from '@/lib/tile-registry';

/**
 * GET /api/object_info
 * ComfyUI-style endpoint returning dynamic registry definitions for all backend modules
 */
export async function GET() {
    try {
        // Map the internal TS registry to a format similar to ComfyUI's object_info
        const objectInfo: Record<string, any> = {};

        for (const [key, definition] of Object.entries(TILE_REGISTRY)) {
            objectInfo[key] = {
                name: definition.label,
                description: definition.description,
                category: definition.category,
                input: {
                    required: definition.inputs?.reduce((acc: Record<string, any>, input) => {
                        if (input.required !== false) {
                            acc[input.id] = [input.type.toUpperCase()];
                        }
                        return acc;
                    }, {}),
                    optional: definition.inputs?.reduce((acc: Record<string, any>, input) => {
                        if (input.required === false) {
                            acc[input.id] = [input.type.toUpperCase()];
                        }
                        return acc;
                    }, {})
                },
                output: definition.outputs?.map(output => output.type.toUpperCase()),
                output_name: definition.outputs?.map(output => output.label),
                output_node: definition.category === 'output' || definition.category === 'action'
            };
        }

        return NextResponse.json(objectInfo);
    } catch (error) {
        console.error('Error serving object_info:', error);
        return NextResponse.json(
            { error: 'Failed to retrieve node object info definitions' },
            { status: 500 }
        );
    }
}
