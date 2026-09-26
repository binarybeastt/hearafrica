// Builds each 3D world headlessly and prints a fingerprint of its scene graph:
// every mesh's geometry, colour and world position. A refactor of the scene
// code must leave these unchanged.
//
//   node scripts/scene-fingerprint.cjs            print the fingerprints
//   node scripts/scene-fingerprint.cjs --save     record them as the baseline
//   node scripts/scene-fingerprint.cjs --check    compare against the baseline

process.noDeprecation = true; // three's CommonJS build warns on require

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');
const BASELINE = path.join(ROOT, 'tests', 'scene-fingerprints.json');

// Load the app's TypeScript directly, resolving the '@/' alias to src/.
const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(ROOT, 'src', request.slice(2));
  return resolve.call(this, request, parent, ...rest);
};
Module._extensions['.ts'] = (module, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  module._compile(out, filename);
};
Module._extensions['.tsx'] = Module._extensions['.ts'];
const tsResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  try {
    return tsResolve.call(this, request, parent, ...rest);
  } catch (err) {
    for (const ext of ['.ts', '.tsx']) {
      try {
        return tsResolve.call(this, request + ext, parent, ...rest);
      } catch {}
    }
    throw err;
  }
};

// Canvas textures need a document; a drawing context that ignores every call
// is enough, since only the scene graph is fingerprinted.
const context = new Proxy({}, { get: () => () => ({ width: 0 }), set: () => true });
global.document = { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };

const THREE = require('three');
const r = (n) => Math.round(n * 1000) / 1000;

function fingerprint(scene) {
  scene.updateMatrixWorld(true);
  const rows = [];
  const p = new THREE.Vector3();
  scene.traverse((o) => {
    if (!o.isMesh && !o.isLineSegments && !o.isLight) return;
    o.getWorldPosition(p);
    const g = o.geometry;
    // Ids are random per build; everything else about a shape is not.
    const params = g?.parameters
      ? JSON.stringify(g.parameters, (k, v) => (k === 'uuid' ? undefined : typeof v === 'number' ? r(v) : v))
      : '';
    const colour = o.material?.color ? o.material.color.getHexString() : '';
    rows.push([o.type, g?.type ?? '', params, colour, r(p.x), r(p.y), r(p.z), o.isInstancedMesh ? o.count : ''].join('|'));
  });
  return {
    objects: rows.length,
    hash: crypto.createHash('sha256').update(rows.join('\n')).digest('hex').slice(0, 16),
  };
}

const WORLDS = {
  balogun: () => require(path.join(ROOT, 'src/components/scene/balogun-scene.ts')).buildBaloganScene(),
  kejetia: () => require(path.join(ROOT, 'src/components/scene/kejetia-scene.ts')).buildKejetiaScene(),
  nairobi: () => require(path.join(ROOT, 'src/components/scene/nairobi-scene.ts')).buildNairobiScene(),
};

const results = {};
for (const [name, build] of Object.entries(WORLDS)) results[name] = fingerprint(build().scene);

const mode = process.argv[2];
if (mode === '--save') {
  fs.writeFileSync(BASELINE, JSON.stringify(results, null, 2) + '\n');
  console.log('saved', results);
} else if (mode === '--check') {
  const baseline = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  let ok = true;
  for (const name of Object.keys(baseline)) {
    const same = baseline[name].hash === results[name]?.hash;
    ok &&= same;
    console.log(`${same ? 'same   ' : 'CHANGED'} ${name}: ${results[name]?.objects} objects ${results[name]?.hash}` +
      (same ? '' : ` (was ${baseline[name].objects} ${baseline[name].hash})`));
  }
  process.exit(ok ? 0 : 1);
} else {
  console.log(results);
}
