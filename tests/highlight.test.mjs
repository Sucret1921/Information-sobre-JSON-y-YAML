import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const hl = require('../assets/js/lib/highlight.js');
const strip = (html) => html.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

test('el resaltado no altera el texto', () => {
  const json = '[{"nombre": "Ana <b>", "edad": 90, "ok": true, "x": null}]';
  const yaml = 'hr:  65    # Home runs\n- nombre: "a # b"\n  lista: [1, 2]\n# comentario';
  assert.equal(strip(hl.json(json)), json);
  assert.equal(strip(hl.yaml(yaml)), yaml);
});

test('escapa HTML', () => {
  assert.ok(!hl.json('"<script>"').includes('<script>'));
  assert.ok(!hl.yaml('k: <img onerror=x>').includes('<img'));
});

test('clasifica tokens YAML', () => {
  const out = hl.yaml('hr: 65 # c');
  assert.match(out, /tok-key">hr</);
  assert.match(out, /tok-number">65</);
  assert.match(out, /tok-comment"># c</);
});
