import dns from 'node:dns/promises';
import net from 'node:net';
import tls from 'node:tls';

// Type definitions for our Tool Responses
export type ToolResult = 
  | { type: 'dns'; data: string[] | object }
  | { type: 'ping'; status: 'online' | 'offline'; latency: number }
  | { type: 'ssl'; valid: boolean; issuer: string; daysRemaining: number }
  | { type: 'error'; message: string };

/**
 * The Master Engine that routes requests to the correct Node.js API
 */
export class NetworkEngine {
  
  // 1. DNS Engine (Native Node.js)
  static async resolveDNS(domain: string, recordType: string = 'A') {
    try {
      switch (recordType.toUpperCase()) {
        case 'MX': return await dns.resolveMx(domain);
        case 'TXT': return await dns.resolveTxt(domain);
        case 'NS': return await dns.resolveNs(domain);
        case 'AAAA': return await dns.resolve6(domain);
        case 'SOA': return await dns.resolveSoa(domain);
        case 'CAA': return await dns.resolveCaa(domain);
        default: return await dns.resolve4(domain);
      }
    } catch (e: any) {
      throw new Error(`DNS Resolution failed: ${e.message}`);
    }
  }

  // 2. TCP/Port Engine (Replaces Ping)
  static async checkPort(host: string, port: number = 443): Promise<ToolResult> {
    return new Promise((resolve) => {
      const start = performance.now();
      const socket = new net.Socket();
      socket.setTimeout(2000); // 2s timeout

      socket.connect(port, host, () => {
        const latency = Math.round(performance.now() - start);
        socket.destroy();
        resolve({ type: 'ping', status: 'online', latency });
      });

      socket.on('error', () => {
        socket.destroy();
        resolve({ type: 'ping', status: 'offline', latency: 0 });
      });

      socket.on('timeout', () => {
        socket.destroy();
        resolve({ type: 'ping', status: 'offline', latency: 0 });
      });
    });
  }

  // 3. SSL Engine
  static async checkSSL(host: string): Promise<ToolResult> {
    return new Promise((resolve, reject) => {
      try {
        const socket = tls.connect(443, host, { servername: host }, () => {
          const cert = socket.getPeerCertificate();
          socket.end();

          const validTo = new Date(cert.valid_to);
          const daysRemaining = Math.floor((validTo.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          resolve({
            type: 'ssl',
            valid: socket.authorized || false,
            issuer: (cert.issuer as any).O || 'Unknown',
            daysRemaining
          });
        });

        socket.on('error', (e) => resolve({ type: 'error', message: e.message }));
      } catch (e) {
        resolve({ type: 'error', message: 'SSL Connection Failed' });
      }
    });
  }
}
