import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { ToolRunner } from '@/components/tool-runner';
import toolsData from '@/data/tools.json';

// Type safety for our JSON
type Tool = typeof toolsData[0];

// 1. Generate Static Params (Optional for SSG, but good for SEO awareness)
export async function generateStaticParams() {
  return toolsData.map((tool) => ({
    slug: tool.slug,
  }));
}

// 2. Dynamic SEO Metadata
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const tool = toolsData.find((t) => t.slug === params.slug);
  if (!tool) return {};

  return {
    title: `${tool.title} - Free Premium Tool | Rovo`,
    description: tool.description,
    keywords: [...(tool.seo?.keywords || []), "free network tools", "developer tools"],
    openGraph: {
      title: tool.title,
      description: tool.description,
      type: 'website',
      url: `https://rovo.dev/tools/${tool.slug}`,
    },
    alternates: {
      canonical: `https://rovo.dev/tools/${tool.slug}`,
    }
  };
}

// 3. The Page Component
export default function ToolPage({ params }: { params: { slug: string } }) {
  const tool = toolsData.find((t) => t.slug === params.slug);

  if (!tool) return notFound();

  // JSON-LD Structured Data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": tool.title,
    "applicationCategory": "DeveloperApplication",
    "operatingSystem": "Web",
    "description": tool.description,
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  };

  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <ToolRunner 
        tool={tool} // Pass the full tool config object
      />

      {/* SEO Content Section (Bottom of page) */}
      <section className="prose prose-invert max-w-none mt-16 border-t border-white/10 pt-12">
        <h2 className="text-2xl font-bold text-white mb-4">About {tool.title}</h2>
        <p className="text-gray-400">
          The {tool.title} is a professional-grade diagnostic tool designed for system administrators, 
          developers, and cybersecurity professionals. It helps you {tool.description.toLowerCase()}
        </p>
        
        <h3 className="text-xl font-semibold text-white mt-6 mb-3">Common Questions</h3>
        <div className="space-y-4">
          <div className="bg-white/5 rounded-lg p-4">
            <h4 className="font-medium text-blue-400">{tool.seo?.question || `Why use ${tool.title}?`}</h4>
            <p className="text-sm text-gray-400 mt-2">
              Using a reliable {tool.title} ensures your infrastructure is correctly configured and secure. 
              Our tool runs directly on the Cloudflare Edge network for maximum speed and accuracy.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
