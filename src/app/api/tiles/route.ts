import { NextRequest, NextResponse } from 'next/server';
import { TILE_REGISTRY } from '@/lib/tile-registry';

// GET - List all available tiles or get specific tile
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tileType = searchParams.get('type');
  const category = searchParams.get('category');

  // Get specific tile
  if (tileType) {
    const tile = TILE_REGISTRY[tileType];
    if (!tile) {
      return NextResponse.json(
        { success: false, error: `Tile type '${tileType}' not found` },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, tile });
  }

  // Get tiles by category
  if (category) {
    const tiles = Object.entries(TILE_REGISTRY)
      .filter(([, tile]) => tile.category === category)
      .map(([, tile]) => tile);

    return NextResponse.json({
      success: true,
      category,
      tiles,
    });
  }

  // Get all tiles grouped by category
  const groupedTiles = {
    input: [] as Array<{ type: string;[key: string]: unknown }>,
    action: [] as Array<{ type: string;[key: string]: unknown }>,
    output: [] as Array<{ type: string;[key: string]: unknown }>,
    logic: [] as Array<{ type: string;[key: string]: unknown }>,
  };

  Object.entries(TILE_REGISTRY).forEach(([type, tile]) => {
    groupedTiles[tile.category].push({ ...tile } as any);
  });

  return NextResponse.json({
    success: true,
    tiles: groupedTiles,
    total: Object.keys(TILE_REGISTRY).length,
  });
}

// POST - Validate tile configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, config } = body;

    const tileDefinition = TILE_REGISTRY[type];
    if (!tileDefinition) {
      return NextResponse.json(
        { success: false, error: `Unknown tile type: ${type}` },
        { status: 400 }
      );
    }

    // Validate required inputs
    const validationErrors: string[] = [];

    // Check if all required inputs are satisfied
    tileDefinition.inputs.forEach((input) => {
      if (input.required && !config.inputs?.[input.id]) {
        validationErrors.push(`Missing required input: ${input.label}`);
      }
    });

    // Type-specific validation
    switch (type) {
      case 'video-input':
        if (!config.fileUrl && config.source === 'upload') {
          validationErrors.push('Video file is required for upload source');
        }
        break;

      case 'video-trimmer':
        if (config.startTime >= config.endTime) {
          validationErrors.push('Start time must be less than end time');
        }
        break;

      case 'ai-summary':
        if (config.maxLength < 50) {
          validationErrors.push('Maximum length must be at least 50 characters');
        }
        break;

    }

    if (validationErrors.length > 0) {
      return NextResponse.json({
        success: false,
        valid: false,
        errors: validationErrors,
      });
    }

    return NextResponse.json({
      success: true,
      valid: true,
      type,
      config: { ...tileDefinition.defaultConfig, ...config },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
