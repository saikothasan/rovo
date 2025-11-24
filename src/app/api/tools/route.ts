import { NextRequest, NextResponse } from 'next/server';
import { NetworkEngine } from '@/lib/engine';
import toolsData from '@/data/tools.json';
import { ToolConfig, ToolResult } from '@/lib/types';

export const runtime = 'nodejs'; // Critical for node:dns

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  const query = searchParams.get('q');

  // Handle "What is my IP" special case (No query needed)
  if (slug === 'what-is-my-ip') {
    const ip = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for') || '127.0.0.1';
    const result: ToolResult = {
      status: 'success',
      timestamp: new Date().toISOString(),
      data: {
        ip,
        city: req.headers.get('cf-ipcity') || 'Unknown',
        country: req.headers.get('cf-ipcountry') || 'Unknown',
        asn: req.headers.get('cf-as-organization') || 'Unknown',
        lat: req.headers.get('cf-iplatitude'),
        lon: req.headers.get('cf-iplongitude')
      }
    };
    return NextResponse.json(result);
  }

  // Validation
  if (!slug) {
    return NextResponse.json({ status: 'error', message: 'Slug required' }, { status: 400 });
  }

  // Find Tool Configuration
  const toolConfig = (toolsData as ToolConfig[]).find(t => t.slug === slug);
  
  if (!toolConfig) {
    return NextResponse.json({ status: 'error', message: 'Tool not found' }, { status: 404 });
  }

  if (!query && toolConfig.inputType !== 'none') {
    return NextResponse.json({ status: 'error', message: 'Query required' }, { status: 400 });
  }

  // Execute Engine
  const result = await NetworkEngine.runTool(
    toolConfig.apiType, 
    query || '', 
    { 
      recordType: toolConfig.recordType,
      prefix: toolConfig.prefix 
    }
  );

  return NextResponse.json(result);
}
