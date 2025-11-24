import { ToolRunner } from '@/components/tool-runner';
import { notFound } from 'next/navigation';

// Configuration map for all 35 tools
const TOOLS_CONFIG: Record<string, { title: string; desc: string; type: string }> = {
  'dns-lookup': { 
    title: 'DNS Lookup', 
    desc: 'Perform a full DNS traversal including A, AAAA, MX, and TXT records.',
    type: 'dns-a'
  },
  'mx-lookup': {
    title: 'MX Record Lookup',
    desc: 'Verify mail exchange servers for email deliverability.',
    type: 'dns-mx'
  },
  'ssl-check': {
    title: 'SSL Certificate Checker',
    desc: 'Analyze SSL/TLS configurations and expiry dates.',
    type: 'ssl'
  },
  // Add all 35 tools here...
};

export default function ToolPage({ params }: { params: { slug: string } }) {
  const tool = TOOLS_CONFIG[params.slug];
  if (!tool) return notFound();

  return (
    <ToolRunner 
      toolId={tool.type} 
      title={tool.title} 
      description={tool.desc} 
    />
  );
}
