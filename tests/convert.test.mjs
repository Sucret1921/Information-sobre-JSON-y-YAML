import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { toYaml, convert, errorPosition } = require('../assets/js/lib/convert.js');

test('escalares y objetos simples', () => {
  assert.equal(toYaml({ hr: 65, avg: 0.278, ok: true, nada: null }), 'hr: 65\navg: 0.278\nok: true\nnada: null');
});

test('array de objetos (ejemplo de la guía)', () => {
  const data = [
    { nombre: 'Pepito Conejo', edad: 25, 'carnet de conducir': true },
    { nombre: 'Ana Barberá', edad: 90, 'carnet de conducir': false },
  ];
  assert.equal(toYaml(data), [
    '- nombre: Pepito Conejo', '  edad: 25', '  carnet de conducir: true',
    '- nombre: Ana Barberá', '  edad: 90', '  carnet de conducir: false',
  ].join('\n'));
});

test('anidación, arrays anidados y colecciones vacías', () => {
  assert.equal(toYaml({ a: { b: [1, [2, 3]] }, e: [], o: {} }),
    'a:\n  b:\n    - 1\n    - - 2\n      - 3\ne: []\no: {}');
});

test('cadenas ambiguas se entrecomillan', () => {
  assert.equal(toYaml(['true', '42', '', 'a: b', '# x', '- y', 'normal']),
    '- "true"\n- "42"\n- ""\n- "a: b"\n- "# x"\n- "- y"\n- normal');
});

test('convert informa línea y columna del error', () => {
  const r = convert('{\n  "a": 1,\n}');
  assert.equal(r.ok, false);
  assert.ok(r.position && r.position.line >= 2);
  assert.deepEqual(errorPosition('Unexpected token at position 5', 'ab\ncdef'), { line: 2, column: 3 });
});
