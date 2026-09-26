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
function blocked(blockers, indoor = false) {
  return blockers.filter((b) => {
    const isCharacter = b.x === 0 && b.z === 0;
    const isApproach = b.x === 0 && b.z > 2 && b.z < 4;
    if (isCharacter || isApproach) return false;
    const onCharacter = !indoor && Math.hypot(b.x, b.z) < 5 + b.r * 0.5;
    // Indoors the person's own furniture (a counter, a chair) is in front of
    // them; the path to check starts beyond it.
    const inCorridor = Math.abs(b.x) < 3 + b.r * 0.5 && b.z > (indoor ? 1.2 : 0) && b.z < 18;
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
        assert.deepEqual(blocked(built.blockers, !!built.bounds), [], `${template}/${stands}/${seed}`);
        assert.equal(built.bisiPosition.length(), 0);
        assert.ok(built.approachPoint.z > 1.5, 'the learner stands in front of them');
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

test('the learner never spawns on a road', () => {
  // The renderer puts them spawnDistance (15m by default) in front of the
  // person, facing them.
  for (const template of SCENE_TEMPLATES) {
    const built = composeScene(normalizeLayout({ template, seed: 3 }));
    const spawnZ = built.spawnDistance ?? 15;
    const roads = [];
    built.scene.traverse((o) => {
      if (o.isMesh && o.geometry.type === 'PlaneGeometry' && o.material.color?.getHexString() === '4b4a46') roads.push(o);
    });
    for (const road of roads) {
      const { width, height } = road.geometry.parameters;
      // Planes are laid flat, so their height runs along z.
      const halfZ = height / 2;
      const halfX = width / 2;
      const onRoad = Math.abs(0 - road.position.x) < halfX && Math.abs(spawnZ - road.position.z) < halfZ;
      assert.equal(onRoad, false, `${template}: spawn is on the road at z=${road.position.z}`);
    }
  }
});

test('rooms keep the learner inside and start them outside the lesson radius', () => {
  for (const template of ['parlour', 'counter']) {
    for (const seed of [1, 7, 42]) {
      const built = composeScene(normalizeLayout({ template, seed, extras: 4, counterKind: 'pharmacy' }));
      assert.ok(built.bounds, `${template} has walls`);
      // The lesson opens within 6m; starting inside that would open it at once.
      assert.ok(built.spawnDistance > 6, `${template} starts ${built.spawnDistance}m away`);
      assert.ok(built.spawnDistance <= built.bounds.maxZ, 'the start point is walkable');
      assert.ok(built.approachPoint.z < built.spawnDistance);
      // Walls on three sides, open toward the learner.
      assert.ok(built.bounds.minX < 0 && built.bounds.maxX > 0 && built.bounds.minZ < 0);
    }
  }
});

test('rooms drop outdoor choices, and streets drop indoor ones', () => {
  const room = normalizeLayout({ template: 'parlour', dressing: ['palms', 'sofas'], vehicles: ['danfo'], character: { stands: 'stall' } });
  assert.deepEqual(room.dressing, ['sofas']);
  assert.deepEqual(room.vehicles, []);
  assert.equal(room.character.stands, 'seated');
  const street = normalizeLayout({ template: 'street', dressing: ['sofas'], character: { stands: 'seated' } });
  assert.ok(!street.dressing.includes('sofas'));
  assert.equal(street.character.stands, 'stall');
});
