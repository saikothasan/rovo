export interface ToolConfig {
  slug: string;
  title: string;
  description: string;
  category: string;
  apiType: ApiType;
  inputType?: 'text' | 'host-port' | 'key-text' | 'none'; // Default is 'domain'
  recordType?: string; // For DNS tools
  prefix?: string;     // For specific DNS lookups like DMARC
  seo: {
    keywords: string[];
    question?: string;
  };
}

export type ApiType = 
  | 'dns' | 'dns-txt' | 'dns-ptr' | 'whois' | 'whois-asn' 
  | 'ping' | 'tcp' | 'banner' | 'ssl' | 'tls-check'
  | 'headers' | 'headers-grade' | 'trace-redirect'
  | 'blacklist' | 'my-ip' | 'mac-oui'
  | 'punycode' | 'crypto-hash' | 'crypto-hmac' | 'crypto-uuid'
  | 'smtp-test' | 'health';

export interface ToolResult {
  status: 'success' | 'error' | 'timeout';
  timestamp: string;
  data?: unknown; // We use unknown instead of any for stricter checking later
  message?: string; // For errors
  grade?: string;   // For grading tools
}

export interface EngineOptions {
  recordType?: string;
  prefix?: string;
  port?: number;
}
