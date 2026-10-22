import { readFile } from 'node:fs/promises';
export const getPath = (object, path) => path ? path.split('.').reduce((v, k) => v?.[k], object) : object;
export function fill(value, vars) {
  if (typeof value === 'string') {
    const exact = value.match(/^\{\{(\w+)\}\}$/);
    if (exact) return vars[exact[1]] ?? '';
    return value.replace(/\{\{(\w+)\}\}/g, (_, key) => String(vars[key] ?? ''));
  }
  if (Array.isArray(value)) return value.map(v => fill(v, vars));
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,fill(v,vars)]));
  return value;
}
export function validateURL(value) {
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol) || url.port === '9000' || url.username || url.password) throw new Error('Invalid class endpoint configuration.');
  return url;
}
export async function settings() { return JSON.parse(await readFile(new URL('./services.json', import.meta.url), 'utf8')); }
export async function service(name, vars, signal) {
  const configs = await settings(), config = configs[name];
  const endpoint = process.env[`${name.toUpperCase()}_URL`];
  if (!endpoint || !config?.body) throw new Error(`${name}: configure its endpoint and documented request body first.`);
  const url = validateURL(endpoint);
  const key = process.env[`${name.toUpperCase()}_KEY`];
  const headers = {'Content-Type':'application/json'};
  if (key) headers[config.authHeader || 'Authorization'] = `${config.authPrefix ?? 'Bearer '}${key}`;
  const body = fill(config.body,{...vars,model:config.model});
  if (name === 'chatterbox' && !body.ref_audio) delete body.ref_audio;
  if (name === 'ace') {
    const headers = {'Content-Type':'application/json', ...(key ? {Authorization:`Bearer ${key}`} : {})};
    const call = async (path, body) => {
      let r;
      try { r = await fetch(new URL(path,url),{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(120000),redirect:'error'}); }
      catch { throw new Error('ace: connection failed or timed out. Try again.'); }
      if (!r.ok) throw new Error(`ace: request failed (HTTP ${r.status}). Try again.`);
      return r.json();
    };
    const submitted = await call('/release_task',body);
    const id = submitted.data?.task_id;
    if (!id) throw new Error('ace: no task ID returned. Check service availability.');
    for (let i=0;i<180;i++) {
      await new Promise(resolve=>setTimeout(resolve,3000));
      const status = (await call('/query_result',{task_id_list:[id]})).data?.[0];
      if (Number(status?.status) === 2) throw new Error('ace: music generation failed. Try again.');
      if (Number(status?.status) !== 1) continue;
      const results = typeof status.result === 'string' ? JSON.parse(status.result) : status.result;
      const file = results?.[0]?.file;
      if (!file) throw new Error('ace: no audio file returned.');
      const download = new URL(file,url);
      if (download.origin !== url.origin) throw new Error('ace: unexpected media origin.');
      const r = await fetch(download,{headers,signal:AbortSignal.timeout(120000),redirect:'error'});
      if (!r.ok) throw new Error('ace: audio download failed.');
      return {buffer:Buffer.from(await r.arrayBuffer()),mime:'audio/mpeg'};
    }
    throw new Error('ace: generation timed out. Try again later.');
  }
  let response;
  try { response = await fetch(url, {method:'POST',headers,body:JSON.stringify(body),signal:signal || AbortSignal.timeout(600000),redirect:'error'}); }
  catch { throw new Error(`${name}: connection failed or timed out. Check the class service and try again.`); }
  if (!response.ok) throw new Error(`${name}: request failed (HTTP ${response.status}). Check configuration and retry.`);
  const type = response.headers.get('content-type') || '';
  if (!type.includes('json')) {
    if (!type.startsWith('audio/') && !type.startsWith('image/')) throw new Error(`${name}: expected generated media or JSON.`);
    return {buffer:Buffer.from(await response.arrayBuffer()), mime:type};
  }
  const result = getPath(await response.json(),config.resultPath);
  if (name === 'qwen') {
    if (typeof result !== 'string' || !result.trim()) throw new Error('qwen: no text returned. Check resultPath.');
    return result.trim();
  }
  if (typeof result !== 'string') throw new Error(`${name}: no media returned. Check resultPath and the API documentation.`);
  if (result.startsWith('data:')) {
    const match = result.match(/^data:((?:audio|image)\/[\w.+-]+);base64,([\s\S]+)$/);
    if (!match) throw new Error(`${name}: unsupported media encoding.`);
    return {buffer:Buffer.from(match[2],'base64'),mime:match[1]};
  }
  if (config.encoding === 'base64') return {buffer:Buffer.from(result,'base64'),mime:config.mime};
  // Generated media downloads are restricted to the configured service origin.
  const mediaURL = new URL(result,url);
  if (mediaURL.origin !== url.origin) throw new Error(`${name}: media URL must use the configured service origin.`);
  const media = await fetch(mediaURL,{headers:key ? {[config.authHeader || 'Authorization']:`${config.authPrefix ?? 'Bearer '}${key}`} : {},signal:AbortSignal.timeout(120000),redirect:'error'});
  if (!media.ok) throw new Error(`${name}: could not download generated media.`);
  return {buffer:Buffer.from(await media.arrayBuffer()),mime:config.mime};
}
