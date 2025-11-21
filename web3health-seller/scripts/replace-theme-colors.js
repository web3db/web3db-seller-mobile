const fs = require('fs');
const path = require('path');

// Files to process
const root = path.resolve(__dirname, '..');

const exts = ['.ts', '.tsx', '.js', '.jsx'];

const mapping = [
  // exact hex -> replacement (use Colors or palette as strings)
  ['Colors.light.background', 'Colors.light.background'],
  ['Colors.light.background', 'Colors.light.background'],
  ['Colors.light.text', 'Colors.light.text'],
  ['Colors.light.text', 'Colors.light.text'],
  ['palette.light.surface', 'palette.light.surface'],
  ['palette.light.surface', 'palette.light.surface'],
  ['palette.light.surface', 'palette.light.surface'],
  ['palette.light.surface', 'palette.light.surface'],
  ['palette.light.surface', 'palette.light.surface'],
  ['palette.light.surface', 'palette.light.surface'],
  ['palette.light.muted', 'palette.light.muted'],
  ['palette.light.border', 'palette.light.border'],
  ['palette.light.border', 'palette.light.border'],
  ['palette.light.border', 'palette.light.border'],
  ['palette.light.border', 'palette.light.border'],
  ['palette.light.muted', 'palette.light.muted'],
  ['palette.light.muted', 'palette.light.muted'],
  ['palette.light.muted', 'palette.light.muted'],
  ['palette.light.muted', 'palette.light.muted'],
  ['Colors.light.tint', 'Colors.light.tint'],
  ['Colors.light.tint', 'Colors.light.tint'],
  ['Colors.light.tint', 'Colors.light.tint'],
  ['Colors.light.tint', 'Colors.light.tint'],
  ['Colors.light.tint', 'Colors.light.tint'],
  ['Colors.light.icon', 'Colors.light.icon'],
  ['Colors.light.text', 'Colors.light.text'],
  ['Colors.light.text', 'Colors.light.text'],
  ['Colors.light.text', 'Colors.light.text'],
  ['Colors.light.text', 'Colors.light.text'],
  ['Colors.light.text333', 'Colors.light.text'],
  ['Colors.light.text', 'Colors.light.text'],
  ['Colors.light.text', 'Colors.light.text'],
  ['palette.light.text.secondary', 'palette.light.text.secondary'],
  ['palette.light.text.muted', 'palette.light.text.muted'],
  ['palette.light.text.muted', 'palette.light.text.muted'],
  ['palette.light.text.muted', 'palette.light.text.muted'],
  ['palette.light.danger', 'palette.light.danger'],
  ['Colors.light.tint', 'Colors.light.tint'],
  ['palette.light.text.muted', 'palette.light.text.muted'],
  ['Colors.light.tint', 'Colors.light.tint'],
  ['Colors.light.tint', 'Colors.light.tint'],
  ['palette.light.success', 'palette.light.success'],
  ['palette.light.success', 'palette.light.success'],
];

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (['node_modules', '.git', 'dist', 'build'].includes(e.name)) continue;
      walk(full);
    } else if (exts.includes(path.extname(e.name))) {
      processFile(full);
    }
  }
}

function processFile(file) {
  let src = fs.readFileSync(file, 'utf8');
  let orig = src;
  // skip the theme file itself
  if (file.includes('constants' + path.sep + 'theme.ts') || file.includes('src' + path.sep + 'theme')) return;

  let addedImport = false;
  for (const [hex, repl] of mapping) {
    const re = new RegExp(hex.replace(/#/g, '\\#'), 'gi');
    if (re.test(src)) {
      src = src.replace(re, repl);
      // mark that we need imports
      if (/Colors\.light|palette\.light/.test(repl)) addedImport = true;
    }
  }

  if (src !== orig) {
    // inject import if not present
    if (addedImport && !/from '\/?@?\/?constants\/theme'/.test(src) && !/from "\/?@?\/?constants\/theme"/.test(src) ) {
      // try to add after the first import block
      const insert = "import { Colors, palette } from '@/constants/theme';\n";
      // place after first import
      const importIndex = src.indexOf('\nimport ');
      if (importIndex !== -1) {
        const firstLineEnd = src.indexOf('\n', importIndex + 1);
        src = src.slice(0, firstLineEnd + 1) + insert + src.slice(firstLineEnd + 1);
      } else {
        src = insert + src;
      }
    }

    fs.writeFileSync(file, src, 'utf8');
    console.log('Patched', file);
  }
}

walk(root);
console.log('Done');
