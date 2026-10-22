import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

test('switches all three designs while preserving shared playback and library state', () => {
  const elements = new Map();
  const storage = new Map();
  const get = id => {
    if (!elements.has(id)) elements.set(id, { value:'', textContent:'', events:{}, addEventListener(event, fn) { this.events[event] = fn; } });
    return elements.get(id);
  };
  const audio = { currentTime:42, paused:false };
  const library = [{ id:'shared-song' }];
  const context = vm.createContext({ document:{ documentElement:{dataset:{}}, getElementById:get, querySelectorAll:() => [] }, localStorage:{ getItem:k=>storage.get(k), setItem:(k,v)=>storage.set(k,v) }, audio, library });
  vm.runInContext(readFileSync('public/static/interface-preference.js','utf8'), context);
  vm.runInContext(readFileSync('public/static/interfaces.js','utf8'), context);
  for (const [choice, brand] of [['james','Midnight Radio'],['oliver','Afterhours'],['elias','AI Jukebox']]) {
    get('interface-select').value = choice;
    get('interface-select').events.change();
    assert.equal(context.document.documentElement.dataset.interface, choice);
    assert.equal(get('ui-brand').textContent, brand);
    assert.equal(storage.get('jukebox-interface'), choice);
    assert.equal(context.audio, audio);
    assert.equal(audio.currentTime, 42);
    assert.equal(context.library, library);
  }
  storage.set('jukebox-interface','oliver');
  vm.runInContext(readFileSync('public/static/interface-preference.js','utf8'), context);
  assert.equal(context.document.documentElement.dataset.interface,'oliver');
  storage.set('jukebox-interface','unknown');
  vm.runInContext(readFileSync('public/static/interface-preference.js','utf8'), context);
  assert.equal(context.document.documentElement.dataset.interface,'elias');
});
