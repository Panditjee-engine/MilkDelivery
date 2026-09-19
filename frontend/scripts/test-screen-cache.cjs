const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const snapshots = new Map();
let session = 1;
let updates = 0;
const api = {
  getSnapshotSession: () => session,
  getScreenSnapshot: key => snapshots.get(key),
  setScreenSnapshot: (key, value) => snapshots.set(key, value),
};
const exportsObject = {};
const source = fs.readFileSync(path.join(__dirname, '../src/hooks/useCachedScreenState.ts'), 'utf8');
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS },
}).outputText, {
  exports: exportsObject,
  require: name => {
    if (name === '../services/api') return { api };
    if (name === 'react') return {
      useRef: value => ({ current: value }),
      useCallback: callback => callback,
      useState: initial => [typeof initial === 'function' ? initial() : initial, () => updates++],
    };
    throw new Error(`Unexpected module ${name}`);
  },
});
const useCache = exportsObject.useCachedScreenState;
const [initial, update] = useCache('orders', []);
assert.equal(initial.length, 0);
update([{ id: '1', status: 'pending' }]);
assert.equal(updates, 1);
update([{ id: '1', status: 'pending' }]);
assert.equal(updates, 1, 'Unchanged responses must preserve state identity');
assert.equal(useCache('orders', [])[0][0].id, '1', 'Remount restores list');
update(previous => previous.map(item => ({ ...item, status: 'delivered' })));
assert.equal(snapshots.get('orders')[0].status, 'delivered');
assert.equal(useCache('another-role', [])[0].length, 0);
session++;
snapshots.clear();
update([{ id: 'old-user' }]);
assert.equal(snapshots.size, 0, 'Old-session responses must be ignored');
const [, emptyUpdate] = useCache('empty', []);
emptyUpdate([]);
assert.ok(snapshots.has('empty'), 'Successfully loaded empty lists are cached');
console.log('Screen cache tests passed: restore, unchanged data, functional updates, isolation, empty lists.');
