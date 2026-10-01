// Verifica que tokens.css refleja los colores del tema oscuro y de marca de design/design-system.yaml
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const yaml = readFileSync(new URL('../design/design-system.yaml', import.meta.url), 'utf8');
const css = readFileSync(new URL('../assets/css/tokens.css', import.meta.url), 'utf8');
const rootBlock = css.slice(css.indexOf(':root {'), css.indexOf('}', css.indexOf(':root {')));

function block(name) {
  const start = yaml.indexOf(`    ${name}:\n`);
  const lines = yaml.slice(start).split('\n').slice(1);
  const out = {};
  for (const line of lines) {
    const m = /^ {6}([\w-]+): "([^"]+)"/.exec(line);
    if (!m) break;
    out[m[1]] = m[2];
  }
  return out;
}

test('colores oscuros y de marca sincronizados', () => {
  const tokens = { ...block('dark'), ...block('brand') };
  assert.ok(Object.keys(tokens).length >= 15);
  for (const [key, value] of Object.entries(tokens)) {
    assert.ok(rootBlock.includes(`--${key}: ${value};`), `--${key} debería ser ${value}`);
  }
});
