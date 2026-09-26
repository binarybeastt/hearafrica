const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { ROOT } = require('../scripts/ts-register.cjs');

const { composeScene } = require(path.join(ROOT, 'src/components/scene/compose.ts'));
const layouts = require(path.join(ROOT, 'src/data/scene-layout.ts'));
const { normalizeLayout, SCENE_TEMPLATES, STANDS } = layouts;

test('model output is cleaned, never trusted', () => {
  const layout = normalizeLayout({
    template: 'spaceship',
    dressing: ['palms', 'volcano', 'palms', 42],
    vehicles: ['danfo', 'tank'],
    density: 'riot',
    seed: -3.7,
    priceTitle: '   A VERY LONG PRICE CARD TITLE   ',
    character: { cloth: 'red', accent: '#12ab34', stands: 'throne', head: 'crown' },
  });
  assert.equal(layout.template, 'street');
  assert.deepEqual(layout.dressing, ['palms']);
  assert.deepEqual(layout.vehicles, ['danfo']);
  assert.equal(layout.density, 'busy');
  assert.equal(layout.seed, 4);
  assert.equal(layout.priceTitle, 'A VERY LONG PR');
  assert.match(layout.character.cloth, /^#[0-9a-f]{6}$/i);
  assert.equal(layout.character.accent, '#12ab34');
  assert.equal(layout.character.stands, 'stall');
  assert.equal(layout.character.head, 'gele');
});

test('anything at all still yields a layout', () => {
  for (const junk of [undefined, null, 7, 'street', [], { character: 'nope' }]) {
    assert.doesNotThrow(() => composeScene(normalizeLayout(junk)));
  }
});

// The learner walks in from +z to the character at the origin. A shop or a
// tree in that path, or on top of the character, breaks the scene.
function blocked(blockers) {
  return blockers.filter((b) => {
    const isCharacter = b.x === 0 && b.z === 0;
    const isApproach = b.x === 0 && b.z > 2 && b.z < 4;
    if (isCharacter || isApproach) return false;
    const onCharacter = Math.hypot(b.x, b.z) < 5 + b.r * 0.5;
    const inCorridor = Math.abs(b.x) < 3 + b.r * 0.5 && b.z > 0 && b.z < 18;
    return onCharacter || inCorridor;
  });
}

test('every template leaves the character and the walk-in path clear', () => {
  for (const template of SCENE_TEMPLATES) {
    for (const stands of STANDS) {
      for (const seed of [1, 7, 99]) {
        const built = composeScene(
          normalizeLayout({ template, seed, dressing: ['umbrella-stalls', 'kiosks', 'palms', 'towers', 'shelter'], character: { stands } })
        );
        assert.deepEqual(blocked(built.blockers), [], `${template}/${stands}/${seed}`);
        assert.equal(built.bisiPosition.length(), 0);
        assert.ok(built.approachPoint.z > 2, 'the learner stands in front of them');
      }
    }
  }
});

test('the same layout always builds the same scene', () => {
  const layout = normalizeLayout({ template: 'market-lane', seed: 11 });
  const positions = (built) => {
    const out = [];
    built.scene.traverse((o) => o.isMesh && out.push(o.position.toArray().map((n) => n.toFixed(3)).join(',')));
    return out.join(';');
  };
  assert.equal(positions(composeScene(layout)), positions(composeScene(layout)));
});
