/* Resaltado de sintaxis ligero para JSON y YAML (sin dependencias). */
(function (root) {
  'use strict';

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  function escape(s) { return String(s).replace(/[&<>"]/g, function (c) { return ESC[c]; }); }
  function span(cls, text) { return '<span class="tok-' + cls + '">' + escape(text) + '</span>'; }

  var JSON_TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}\[\],:])/g;

  function json(src) {
    var out = '', last = 0, m;
    JSON_TOKEN.lastIndex = 0;
    while ((m = JSON_TOKEN.exec(src))) {
      out += escape(src.slice(last, m.index));
      if (m[1]) out += span(m[2] ? 'key' : 'string', m[1]) + (m[2] ? span('punct', m[2]) : '');
      else if (m[3]) out += span('number', m[3]);
      else if (m[4]) out += span('bool', m[4]);
      else out += span('punct', m[5]);
      last = JSON_TOKEN.lastIndex;
    }
    return out + escape(src.slice(last));
  }

  // Posición de un comentario '#' fuera de comillas (precedido de espacio o al inicio)
  function commentIndex(line) {
    var quote = null;
    for (var i = 0; i < line.length; i++) {
      var c = line[i];
      if (quote) { if (c === quote && line[i - 1] !== '\\') quote = null; continue; }
      if (c === '"' || c === "'") quote = c;
      else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) return i;
    }
    return -1;
  }

  function yamlValue(v) {
    var trimmed = v.trim();
    if (!trimmed) return escape(v);
    var lead = v.slice(0, v.indexOf(trimmed)), tail = v.slice(v.indexOf(trimmed) + trimmed.length);
    var cls;
    if (/^-?\d+(\.\d+)?([eE][+-]?\d+)?$/.test(trimmed)) cls = 'number';
    else if (/^(true|false|null|~|yes|no|on|off)$/i.test(trimmed)) cls = 'bool';
    else if (/^[\[\]{}|>]+$/.test(trimmed)) cls = 'punct';
    else if (/^\[.*\]$|^\{.*\}$/.test(trimmed)) return escape(lead) + json(trimmed) + escape(tail);
    else cls = 'string';
    return escape(lead) + span(cls, trimmed) + escape(tail);
  }

  function yamlLine(line) {
    var ci = commentIndex(line);
    var body = ci >= 0 ? line.slice(0, ci) : line;
    var comment = ci >= 0 ? line.slice(ci) : '';
    var out = '';

    var m = /^(\s*)((?:-\s+)*)/.exec(body);
    out += escape(m[1]);
    if (m[2]) out += span('dash', m[2]);
    var rest = body.slice(m[0].length);

    var kv = /^("(?:\\.|[^"\\])*"|'[^']*'|[^\s"'#\[\]{}][^:#]*?)(:)(?=\s|$)/.exec(rest);
    if (kv) {
      out += span('key', kv[1]) + span('punct', kv[2]) + yamlValue(rest.slice(kv[0].length));
    } else {
      out += yamlValue(rest);
    }
    return out + (comment ? span('comment', comment) : '');
  }

  function yaml(src) { return String(src).split('\n').map(yamlLine).join('\n'); }

  function highlight(src, lang) {
    return lang === 'json' ? json(src) : lang === 'yaml' ? yaml(src) : escape(src);
  }

  var api = { highlight: highlight, json: json, yaml: yaml, escape: escape };
  root.Guide = root.Guide || {};
  root.Guide.highlight = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
