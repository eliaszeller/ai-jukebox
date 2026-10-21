import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import worker from '../worker/index.js';

const env = { ...process.env };
env.MEDIA_SIGNING_KEY ||= randomBytes(32).toString('base64');
const endpointIndex = process.argv.indexOf('--endpoints');
if (endpointIndex !== -1) {
  const content = readFileSync(process.argv[endpointIndex + 1], 'utf8');
  const blocks = content.split(/\n\s*\n/);
  const textBlock = blocks.find(block => block.includes('9001'));
  const key = textBlock?.match(/API Key:\s*([^\r\n]+)/)?.[1]?.trim();
  if (!key) throw new Error('Could not read the class API key from the endpoint file.');
  env.CLASS_API_KEY = key;
}
if (!env.CLASS_API_KEY) console.warn('CLASS_API_KEY is not set. The interface will work; generation requires configuration.');
const port = Number(process.env.PORT || 4173);
const server = http.createServer(async (req, res) => {
  try {
    const chunks = []; let size = 0;
    for await (const chunk of req) { size += chunk.length; if (size > (req.url === '/api/dj' ? 12 * 1024 * 1024 : 40000)) { res.writeHead(413); res.end('Request too large'); return; } chunks.push(chunk); }
    const request = new Request(`http://127.0.0.1:${port}${req.url}`, { method: req.method, headers: req.headers, ...(req.method === 'GET' || req.method === 'HEAD' ? {} : { body: Buffer.concat(chunks) }) });
    const response = await worker.fetch(request, env, { waitUntil: promise => promise.catch(() => {}) });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    if (response.body) { for await (const chunk of response.body) { if (!res.write(chunk)) await new Promise(resolve => res.once('drain', resolve)); } }
    res.end();
  } catch { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ error: 'The local server could not complete this request.' })); }
});
server.listen(port, '127.0.0.1', () => console.log(`Afterhours is listening at http://127.0.0.1:${port}`));
