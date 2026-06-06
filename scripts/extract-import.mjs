#!/usr/bin/env node
// turns import/icons/*/index.tsx (React components) into clean standalone SVGs.
// run: node scripts/extract-import.mjs
// out: import/_extracted/<category>/<kebab-name>.svg

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, '..');
const ICONS_DIR = path.join(REPO_ROOT, 'import', 'icons');
const OUT_DIR = path.join(REPO_ROOT, 'import', '_extracted');

const KEEP_CAMEL_ATTRS = new Set([
  'viewBox',
  'preserveAspectRatio',
  'gradientTransform',
  'gradientUnits',
  'patternUnits',
  'patternContentUnits',
  'spreadMethod',
  'clipPathUnits',
  'maskUnits',
  'maskContentUnits',
]);

const SKIP_TAGS = new Set(['foreignObject', 'script', 'iframe', 'embed', 'object', 'use']);

function toKebab(s) {
  return s
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function hasExportModifier(node) {
  return node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function unwrapParens(node) {
  while (node && ts.isParenthesizedExpression(node)) node = node.expression;
  return node;
}

function jsxFromForwardRef(init) {
  init = unwrapParens(init);
  if (!init || !ts.isCallExpression(init)) return null;
  const callee = init.expression;
  if (!(ts.isIdentifier(callee) && callee.text === 'forwardRef')) return null;
  const fn = init.arguments[0];
  if (!fn) return null;
  if (!(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) return null;
  let body = fn.body;
  if (ts.isBlock(body)) {
    for (const stmt of body.statements) {
      if (ts.isReturnStatement(stmt) && stmt.expression) {
        return unwrapParens(stmt.expression);
      }
    }
    return null;
  }
  return unwrapParens(body);
}

function collectForwardRefExports(sourceFile) {
  const components = new Map();
  function walk(node) {
    if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        const jsx = jsxFromForwardRef(decl.initializer);
        if (jsx) components.set(decl.name.text, jsx);
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(sourceFile);
  return components;
}

function collectIconArray(sourceFile) {
  const items = [];
  function walk(node) {
    if (ts.isVariableStatement(node) && hasExportModifier(node)) {
      for (const decl of node.declarationList.declarations) {
        if (!ts.isIdentifier(decl.name)) continue;
        if (!/Icons$/.test(decl.name.text)) continue;
        const init = decl.initializer;
        if (!init || !ts.isArrayLiteralExpression(init)) continue;
        for (const el of init.elements) {
          if (!ts.isObjectLiteralExpression(el)) continue;
          const item = {};
          for (const p of el.properties) {
            if (!ts.isPropertyAssignment(p)) continue;
            if (!p.name || !ts.isIdentifier(p.name)) continue;
            const key = p.name.text;
            const value = p.initializer;
            if (key === 'component' && ts.isIdentifier(value)) {
              item.component = value.text;
            } else if (key === 'name' && ts.isStringLiteral(value)) {
              item.name = value.text;
            } else if (key === 'tags' && ts.isArrayLiteralExpression(value)) {
              item.tags = value.elements
                .filter((e) => ts.isStringLiteral(e))
                .map((e) => e.text);
            } else if (key === 'category' && ts.isStringLiteral(value)) {
              item.category = value.text;
            }
          }
          if (item.component) items.push(item);
        }
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(sourceFile);
  return items;
}

function staticAttrValue(init) {
  if (init == null) return ''; // boolean prop
  if (ts.isStringLiteral(init)) return init.text;
  if (ts.isJsxExpression(init) && init.expression) {
    let expr = init.expression;
    if (ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr)) expr = expr.expression;
    if (ts.isStringLiteral(expr)) return expr.text;
    if (ts.isNumericLiteral(expr)) return expr.text;
    if (ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
    if (ts.isPrefixUnaryExpression(expr) && ts.isNumericLiteral(expr.operand)) {
      return (expr.operator === ts.SyntaxKind.MinusToken ? '-' : '') + expr.operand.text;
    }
  }
  return null;
}

function toAttrName(name) {
  if (KEEP_CAMEL_ATTRS.has(name)) return name;
  return name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function escapeAttr(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function escapeText(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getRootTag(node) {
  if (ts.isJsxElement(node)) return node.openingElement.tagName.getText();
  if (ts.isJsxSelfClosingElement(node)) return node.tagName.getText();
  return null;
}

function getAttrs(node) {
  if (ts.isJsxElement(node)) return node.openingElement.attributes.properties;
  if (ts.isJsxSelfClosingElement(node)) return node.attributes.properties;
  return [];
}

function getChildren(node) {
  return ts.isJsxElement(node) ? node.children : [];
}

function findViewBox(node) {
  for (const a of getAttrs(node)) {
    if (!ts.isJsxAttribute(a) || !a.name) continue;
    if (a.name.getText() !== 'viewBox') continue;
    const val = staticAttrValue(a.initializer);
    if (val != null) return val;
  }
  return null;
}

function serializeAttrs(attrs, opts = {}) {
  const out = [];
  for (const a of attrs) {
    if (!ts.isJsxAttribute(a) || !a.name) continue; // skip spreads (no .name)
    const name = a.name.getText();
    if (name === 'ref' || name === 'id') continue;
    if (name.startsWith('on') && /^on[A-Z]/.test(name)) continue;
    if (name === 'xmlns') continue;
    if (opts.stripViewBox && name === 'viewBox') continue;
    if (name === 'xmlnsXlink' || name === 'xlinkHref') continue;
    const val = staticAttrValue(a.initializer);
    if (val === null) continue;
    out.push(`${toAttrName(name)}="${escapeAttr(val)}"`);
  }
  return out.join(' ');
}

function serializeChildren(children) {
  const parts = [];
  for (const c of children) parts.push(serializeNode(c));
  return parts.join('');
}

function serializeNode(node) {
  if (ts.isJsxText(node)) {
    const t = node.getText();
    if (/^\s*$/.test(t)) return '';
    return escapeText(t.replace(/\s+/g, ' '));
  }
  if (ts.isJsxExpression(node)) {
    if (!node.expression) return '';
    const expr = node.expression;
    if (ts.isStringLiteral(expr)) return escapeText(expr.text);
    if (ts.isNumericLiteral(expr)) return expr.text;
    if (ts.isNoSubstitutionTemplateLiteral(expr)) return escapeText(expr.text);
    return '';
  }
  if (ts.isJsxFragment(node)) {
    return serializeChildren(node.children);
  }
  if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
    const tag = getRootTag(node);
    if (!tag) return '';
    if (SKIP_TAGS.has(tag)) return ''; // safety: never emit foreign/script content
    const xmlTag = tag.toLowerCase().includes('.') ? null : tag;
    if (!xmlTag) return ''; // skip member expressions like motion.path
    const attrs = serializeAttrs(getAttrs(node));
    const inner = ts.isJsxElement(node) ? serializeChildren(node.children) : '';
    const prefix = `<${xmlTag}${attrs ? ' ' + attrs : ''}`;
    return inner === '' ? `${prefix}/>` : `${prefix}>${inner}</${xmlTag}>`;
  }
  return '';
}

function jsxToSvg(root) {
  // pull viewBox from root attrs (the original components stick it on the root element,
  // even when the root is a <g> or <path>, where it's not actually a valid attribute)
  const viewBox = findViewBox(root) || '0 0 100 100';
  const tag = getRootTag(root);

  let inner;
  if (tag && tag.toLowerCase() === 'svg') {
    inner = serializeChildren(getChildren(root));
  } else if (ts.isJsxFragment(root)) {
    inner = serializeChildren(root.children);
  } else if (ts.isJsxElement(root) || ts.isJsxSelfClosingElement(root)) {
    // wrap the whole root element (path / g / polygon) inside our <svg>, but strip its viewBox
    const lower = (tag || '').toLowerCase();
    if (SKIP_TAGS.has(lower)) return null;
    const attrs = serializeAttrs(getAttrs(root), { stripViewBox: true });
    const children = ts.isJsxElement(root) ? serializeChildren(root.children) : '';
    inner = children === '' ? `<${lower}${attrs ? ' ' + attrs : ''}/>` : `<${lower}${attrs ? ' ' + attrs : ''}>${children}</${lower}>`;
  } else {
    return null;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${escapeAttr(viewBox)}" fill="currentColor">${inner}</svg>`;
}

async function listCategories() {
  const entries = await fs.readdir(ICONS_DIR, { withFileTypes: true });
  return entries.filter((e) => e.isDirectory()).map((e) => e.name);
}

async function main() {
  await fs.rm(OUT_DIR, { recursive: true, force: true });
  await fs.mkdir(OUT_DIR, { recursive: true });

  const categories = await listCategories();
  const manifest = [];
  let extracted = 0;
  let skipped = 0;

  for (const category of categories) {
    const file = path.join(ICONS_DIR, category, 'index.tsx');
    let src;
    try {
      src = await fs.readFile(file, 'utf8');
    } catch {
      continue;
    }

    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const components = collectForwardRefExports(sf);
    let items = collectIconArray(sf);

    if (items.length === 0) {
      for (const [name] of components) items.push({ component: name, name });
    }

    const outCatDir = path.join(OUT_DIR, category);
    await fs.mkdir(outCatDir, { recursive: true });

    for (const item of items) {
      const jsx = components.get(item.component);
      if (!jsx) {
        skipped++;
        continue;
      }
      const svg = jsxToSvg(jsx);
      if (!svg) {
        skipped++;
        continue;
      }
      const kebab = toKebab(item.component);
      const outFile = path.join(outCatDir, `${kebab}.svg`);
      await fs.writeFile(outFile, svg);
      manifest.push({
        category,
        name: kebab,
        displayName: item.name || item.component,
        tags: item.tags ?? [],
      });
      extracted++;
    }
  }

  await fs.writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`extracted ${extracted} icons across ${categories.length} categories (skipped ${skipped})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
