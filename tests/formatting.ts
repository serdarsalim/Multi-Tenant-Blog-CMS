import assert from 'node:assert/strict';
import { processContent } from '../src/lib/contentProcessor';
const html = '<p style="text-align:center">Caption</p><h2 style="text-align:right;color:rgb(47,158,68)">Heading</h2><img src="https://cdn.test/a.webp" width="441" data-align="right"><ul><li><input type="checkbox" disabled checked>Done</li></ul><p><mark style="background-color:rgb(255,224,184)">Highlight</mark></p>';
for (const dark of [false, true]) {
  const rendered = processContent(html, dark);
  assert.ok(rendered.includes('text-align:center'));
  assert.ok(rendered.includes('text-align:right;color:rgb(47,158,68)'));
  assert.equal((rendered.match(/id="heading"/g) || []).length, 1);
  assert.ok(rendered.includes('width="441" data-align="right"'));
  assert.ok(rendered.includes('type="checkbox" disabled checked'));
  assert.ok(rendered.includes('background-color:rgb(255,224,184)'));
}
console.log('PASS: paragraph and heading alignment, inline colors, highlight, image sizing/alignment, tasks in light/dark output.');
