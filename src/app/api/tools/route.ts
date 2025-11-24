import { NextRequest, NextResponse } from 'next/server';
import { NetworkEngine } from '@/lib/engine';

export const runtime = 'nodejs'; // Forces Node.js compat layer in Workers

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const tool = searchParams.get('tool');
  const query = searchParams.get('q');

  if (!query) return NextResponse.json({ error: 'Query required' }, { status: 400 });

  try {
    let result;
    
    switch (tool) {
      case 'dns-a': 
        result = await NetworkEngine.resolveDNS(query, 'A'); 
        break;
      case 'dns-mx': 
        result = await NetworkEngine.resolveDNS(query, 'MX'); 
        break;
      case 'ping': 
        result = await NetworkEngine.checkPort(query, 80); 
        break;
      case 'ssl': 
        result = await NetworkEngine.checkSSL(query); 
        break;
      default:
        return NextResponse.json({ error: 'Unknown tool' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
