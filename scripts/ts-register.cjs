// Lets plain Node require the app's TypeScript, resolving the '@/' alias to
// src/. For scripts and tests that need whole modules with their real imports
// (the scene code), rather than the one-file loaders the unit tests use.

const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const ts = require('typescript');

const ROOT = path.resolve(__dirname, '..');

const resolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) request = path.join(ROOT, 'src', request.slice(2));
  try {
    return resolve.call(this, request, parent, ...rest);
  } catch (err) {
    for (const ext of ['.ts', '.tsx']) {
      try {
        return resolve.call(this, request + ext, parent, ...rest);
      } catch {}
    }
    throw err;
  }
};

const compile = (module, filename) => {
  const out = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    fileName: filename,
  }).outputText;
  module._compile(out, filename);
};
Module._extensions['.ts'] = compile;
Module._extensions['.tsx'] = compile;

// Canvas textures need a document; a drawing context that ignores every call
// is enough when only the scene graph matters.
const context = new Proxy({}, { get: () => () => ({ width: 0 }), set: () => true });
global.document ??= { createElement: () => ({ width: 0, height: 0, getContext: () => context }) };

process.noDeprecation = true; // three's CommonJS build warns on require

module.exports = { ROOT };
