import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { domainToASCII, domainToUnicode } from 'node:url';
import { ApiType, ToolResult, EngineOptions } from './types';

export class NetworkEngine {
  
  /**
   * Helper to format successful responses
   */
  private static success(data: unknown, grade?: string): ToolResult {
    return {
      status: 'success',
      timestamp: new Date().toISOString(),
      data,
      grade
    };
  }

  /**
   * Helper to format error responses safely
   */
  private static error(error: unknown): ToolResult {
    const message = error instanceof Error ? error.message : String(error);
    return {
      status: 'error',
      timestamp: new Date().toISOString(),
      message
    };
  }

  /**
   * Main Execution Method
   */
  static async runTool(apiType: ApiType, query: string, options: EngineOptions = {}): Promise<ToolResult> {
    try {
      // Input Validation
      if (!query && apiType !== 'my-ip' && apiType !== 'crypto-uuid') {
        throw new Error('Input query is required');
      }

      switch (apiType) {
        // --- DNS GROUP ---
        case 'dns':
          return await this.resolveDNS(query, options.recordType || 'A');
        case 'dns-txt': {
          const target = options.prefix ? `${options.prefix}.${query}` : query;
          return await this.resolveDNS(target, 'TXT');
        }
        case 'dns-ptr':
          return this.success(await dns.reverse(query));

        // --- NETWORK GROUP ---
        case 'ping':
        case 'tcp': {
          // Parse "host:port" or use default
          const port = options.port || (query.includes(':') ? parseInt(query.split(':')[1]) : 80);
          const host = query.includes(':') ? query.split(':')[0] : query;
          return await this.checkPort(host, port);
        }
        
        case 'banner': {
           const port = options.port || (query.includes(':') ? parseInt(query.split(':')[1]) : 22);
           const host = query.includes(':') ? query.split(':')[0] : query;
           return await this.grabBanner(host, port);
        }

        case 'ssl':
        case 'tls-check':
          return await this.checkSSL(query);

        case 'my-ip':
          // This is a placeholder; actual logic happens in route.ts via headers
          return this.success({ message: 'Resolved at Edge via Headers' });

        // --- WEB & SECURITY ---
        case 'blacklist':
          return await this.checkBlacklist(query);
        case 'headers':
          return await this.checkHeaders(query);
        case 'headers-grade':
          return await this.gradeSecurityHeaders(query);
        case 'trace-redirect':
           return await this.traceRedirects(query);

        // --- DEV & CRYPTO ---
        case 'punycode':
          return this.success({
            ascii: domainToASCII(query),
            unicode: domainToUnicode(query)
          });

        case 'crypto-hash':
          return this.success({
            md5: crypto.createHash('md5').update(query).digest('hex'),
            sha1: crypto.createHash('sha1').update(query).digest('hex'),
            sha256: crypto.createHash('sha256').update(query).digest('hex'),
            sha512: crypto.createHash('sha512').update(query).digest('hex')
          });

        case 'crypto-uuid':
          return this.success({
            uuid_v4: crypto.randomUUID(),
            api_key: crypto.randomBytes(32).toString('hex')
          });
          
        case 'whois':
          return await this.simpleWhois(query);

        default:
          throw new Error(`Tool implementation for ${apiType} is missing.`);
      }
    } catch (e) {
      return this.error(e);
    }
  }

  // --- IMPLEMENTATIONS ---

  static async resolveDNS(domain: string, type: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let res: any; // node:dns return types vary wildly, keeping any here is safer than complex union
    switch (type.toUpperCase()) {
      case 'MX': res = await dns.resolveMx(domain); break;
      case 'TXT': res = await dns.resolveTxt(domain); break;
      case 'NS': res = await dns.resolveNs(domain); break;
      case 'SOA': res = await dns.resolveSoa(domain); break;
      case 'AAAA': res = await dns.resolve6(domain); break;
      case 'CNAME': res = await dns.resolveCname(domain); break;
      case 'SRV': res = await dns.resolveSrv(domain); break;
      case 'CAA': res = await dns.resolveCaa(domain); break;
      case 'PTR': res = await dns.reverse(domain); break;
      default: res = await dns.resolve4(domain);
    }
    return this.success(res);
  }

  static async checkPort(host: string, port: number): Promise<ToolResult> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(2000);
      
      socket.connect(port, host, () => {
        socket.destroy();
        resolve(this.success({ status: 'Open', port, host }));
      });
      
      socket.on('error', (err) => {
        socket.destroy();
        resolve(this.error(`Closed or Blocked: ${err.message}`));
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve(this.error('Connection Timed Out'));
      });
    });
  }

  static async grabBanner(host: string, port: number): Promise<ToolResult> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      socket.setTimeout(3000);
      let banner = '';

      socket.connect(port, host, () => {
        // Send a dummy probe for HTTP, otherwise just wait
        if (port === 80 || port === 443) socket.write('HEAD / HTTP/1.0\r\n\r\n');
      });

      socket.on('data', (d) => {
        banner += d.toString();
        socket.destroy();
      });

      socket.on('close', () => resolve(this.success({ banner: banner.trim() || 'Connected (No Banner)' })));
      socket.on('error', (e) => resolve(this.error(e)));
      socket.on('timeout', () => {
        socket.destroy();
        resolve(this.error('Timeout waiting for banner'));
      });
    });
  }

  static async checkSSL(host: string): Promise<ToolResult> {
    return new Promise((resolve) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const socket = tls.connect(443, host, { servername: host }, function() {
        // 'this' refers to the TLSSocket here
        const cert = this.getPeerCertificate();
        const authorized = this.authorized;
        this.end();

        resolve({
          status: 'success',
          timestamp: new Date().toISOString(),
          data: {
            valid: authorized,
            subject: cert.subject,
            issuer: cert.issuer,
            valid_from: cert.valid_from,
            valid_to: cert.valid_to,
            days_remaining: Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86400000)
          }
        });
      });
      socket.on('error', (e) => resolve(this.error(e)));
    });
  }

  static async checkHeaders(url: string): Promise<ToolResult> {
    if (!url.startsWith('http')) url = `https://${url}`;
    const res = await fetch(url, { method: 'HEAD' });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => headers[k] = v);
    return this.success({ status: res.status, headers });
  }

  static async gradeSecurityHeaders(domain: string): Promise<ToolResult> {
     if (!domain.startsWith('http')) domain = `https://${domain}`;
     try {
       const res = await fetch(domain, { method: 'HEAD' });
       let score = 100;
       const details: {header: string, status: string}[] = [];
       
       const required = ['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options'];
       
       required.forEach(h => {
         if (res.headers.has(h)) {
           details.push({ header: h, status: 'PASS' });
         } else {
           score -= 20;
           details.push({ header: h, status: 'FAIL' });
         }
       });

       return this.success({ details }, score >= 80 ? 'A' : score >= 60 ? 'B' : 'F');
     } catch (e) {
       return this.error(e);
     }
  }

  static async traceRedirects(url: string): Promise<ToolResult> {
    if (!url.startsWith('http')) url = `https://${url}`;
    const hops: string[] = [];
    try {
      await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        // Note: Standard fetch doesn't easily expose redirect chains without custom agents or manual loop
        // Simulating manual loop for standard fetch compliance:
      });
      // *Limitation*: Native fetch in workers abstracts redirects. 
      // For true tracing, we would normally use manual HTTP requests, but simply returning the final destination:
      const res = await fetch(url, { redirect: 'follow', method: 'HEAD' });
      hops.push(url);
      if (res.url !== url) hops.push(res.url);
      
      return this.success({ hops, final: res.url, status: res.status });
    } catch (e) {
      return this.error(e);
    }
  }

  static async checkBlacklist(ip: string): Promise<ToolResult> {
    const rbls = ['zen.spamhaus.org', 'b.barracudacentral.org'];
    const rev = ip.split('.').reverse().join('.');
    const results = await Promise.all(rbls.map(async (host) => {
      try {
        await dns.resolve4(`${rev}.${host}`);
        return { rbl: host, status: 'LISTED' };
      } catch {
        return { rbl: host, status: 'CLEAN' };
      }
    }));
    return this.success(results);
  }
  
  static async simpleWhois(domain: string): Promise<ToolResult> {
    return new Promise((resolve) => {
      const socket = new net.Socket();
      let data = '';
      socket.setTimeout(5000);
      socket.connect(43, 'whois.iana.org', () => socket.write(`${domain}\r\n`));
      socket.on('data', c => data += c);
      socket.on('end', () => resolve(this.success({ raw: data.substring(0, 1500) })));
      socket.on('error', e => resolve(this.error(e)));
      socket.on('timeout', () => { socket.destroy(); resolve(this.error('Whois timeout')); });
    });
  }
}
