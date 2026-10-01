/* Conversión JSON → YAML y análisis de errores JSON (sin dependencias). */
(function (root) {
  'use strict';

  var RESERVED = /^(true|false|null|yes|no|on|off|y|n|~)$/i;
  var SPECIAL = /[:#\[\]{},&*!|>'"%@`]|^[-?\s]|\s$|\n|\t/;

  function needsQuotes(s) {
    return s === '' || SPECIAL.test(s) || RESERVED.test(s) || !isNaN(Number(s));
  }

  function scalar(v) {
    if (v === null) return 'null';
    if (typeof v === 'string') return needsQuotes(v) ? JSON.stringify(v) : v;
    return String(v);
  }

  function isNested(v) {
    return v !== null && typeof v === 'object' && Object.keys(v).length > 0;
  }

  function emptyLiteral(v) { return Array.isArray(v) ? '[]' : '{}'; }

  function pad(depth) { return new Array(depth + 1).join('  '); }

  function toYaml(value, depth) {
    depth = depth || 0;

    if (Array.isArray(value)) {
      if (!value.length) return pad(depth) + '[]';
      return value.map(function (item) {
        if (isNested(item)) return pad(depth) + '- ' + toYaml(item, depth + 1).replace(/^\s+/, '');
        if (item !== null && typeof item === 'object') return pad(depth) + '- ' + emptyLiteral(item);
        return pad(depth) + '- ' + scalar(item);
      }).join('\n');
    }

    if (value !== null && typeof value === 'object') {
      var keys = Object.keys(value);
      if (!keys.length) return pad(depth) + '{}';
      return keys.map(function (key) {
        var v = value[key], k = scalar(key);
        if (isNested(v)) return pad(depth) + k + ':\n' + toYaml(v, depth + 1);
        if (v !== null && typeof v === 'object') return pad(depth) + k + ': ' + emptyLiteral(v);
        return pad(depth) + k + ': ' + scalar(v);
      }).join('\n');
    }

    return pad(depth) + scalar(value);
  }

  // Devuelve { line, column } a partir del mensaje de error del motor JS.
  function errorPosition(message, source) {
    var lc = /line (\d+) column (\d+)/i.exec(message);
    if (lc) return { line: +lc[1], column: +lc[2] };
    var pos = /position (\d+)/i.exec(message);
    if (!pos) return null;
    var before = source.slice(0, +pos[1]).split('\n');
    return { line: before.length, column: before[before.length - 1].length + 1 };
  }

  function convert(source) {
    try {
      var data = JSON.parse(source);
      return { ok: true, data: data, yaml: toYaml(data) };
    } catch (err) {
      return { ok: false, error: err.message, position: errorPosition(err.message, source) };
    }
  }

  var api = { toYaml: toYaml, convert: convert, errorPosition: errorPosition };
  root.Guide = root.Guide || {};
  root.Guide.convert = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
