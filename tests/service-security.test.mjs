import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(env, fetcher = async () => { throw new Error('Unexpected network call'); }) {
  const source = readFileSync('lib/jukebox-services.ts', 'utf8');
  const js = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const exports = {};
  vm.runInNewContext(js + ';exports.testRequired=required;exports.testMediaUrl=mediaUrl;', {
    exports, require: name => {assert.equal(name, 'cloudflare:workers');return {env};},
    URL, fetch:fetcher, Uint8Array, atob, btoa, setTimeout,
  });
  return exports;
}

test('rejects reserved port 9000 before making a request', () => {
  const api=load({QWEN_BASE_URL:'http://class.invalid:9000/v1'});
  assert.throws(()=>api.testRequired('QWEN_BASE_URL'), /port 9000/);
});
test('rejects credentials embedded in endpoint URLs', () => {
  const api=load({QWEN_BASE_URL:'http://user:password@class.invalid:9001/v1'});
  assert.throws(()=>api.testRequired('QWEN_BASE_URL'), /embedded credentials/);
});
test('accepts configured service media and rejects other origins', () => {
  const api=load({});
  assert.equal(api.testMediaUrl('/v1/audio?path=file.mp3','http://class.invalid:9007'),'http://class.invalid:9007/v1/audio?path=file.mp3');
  assert.throws(()=>api.testMediaUrl('https://other.invalid/file.mp3','http://class.invalid:9007'), /configured class service/);
  assert.throws(()=>api.testMediaUrl('http://user:password@class.invalid:9007/audio','http://class.invalid:9007'), /configured class service/);
});
test('redacts configured key from upstream errors and disables redirects', async () => {
  const secret='synthetic-test-secret';
  const api=load({CLASS_API_KEY:secret,FLUX_BASE_URL:'http://class.invalid:9006/v1',FLUX_MODEL:'test-model'}, async (url, init) => {
    assert.equal(init.redirect, 'manual');
    return new Response('Upstream echoed '+secret,{status:500});
  });
  await assert.rejects(api.generateCover('cover test'), error => error.message.includes('[redacted]') && !error.message.includes(secret));
});
