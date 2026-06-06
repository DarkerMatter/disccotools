import type {
  Background,
  Layer,
  Recipe,
  Shape,
} from '@disccotools/shared';
import { shapePathD } from '@disccotools/shared';
import { iconUrl } from './iconify.js';

export function recipeToSvgString(
  recipe: Recipe,
  assetUrlOverrides?: Map<string, string>,
): string {
  const size = recipe.size;
  const parts: string[] = [];

  parts.push(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">`,
  );
  parts.push('<defs>');
  parts.push(`<clipPath id="clip">${shapeToSvg(recipe.shape, size)}</clipPath>`);
  if (recipe.background.kind === 'gradient') {
    const eps = gradientEndpoints(recipe.background.angle);
    parts.push(
      `<linearGradient id="bg" x1="${eps.x1}" y1="${eps.y1}" x2="${eps.x2}" y2="${eps.y2}">`,
    );
    parts.push(
      `<stop offset="0%" stop-color="${escapeAttr(recipe.background.from)}" />`,
    );
    parts.push(
      `<stop offset="100%" stop-color="${escapeAttr(recipe.background.to)}" />`,
    );
    parts.push('</linearGradient>');
  }
  parts.push('</defs>');

  parts.push('<g clip-path="url(#clip)">');
  parts.push(backgroundToSvg(recipe.background, size));
  for (const layer of recipe.layers) {
    parts.push(layerToSvg(layer, size, assetUrlOverrides));
  }
  parts.push('</g>');
  parts.push('</svg>');
  return parts.join('');
}

function shapeToSvg(shape: Shape, size: number): string {
  return `<path d="${shapePathD(shape, size)}" />`;
}

function backgroundToSvg(bg: Background, size: number): string {
  if (bg.kind === 'transparent') return '';
  if (bg.kind === 'solid') {
    return `<rect width="${size}" height="${size}" fill="${escapeAttr(bg.color)}" opacity="${bg.opacity}" />`;
  }
  return `<rect width="${size}" height="${size}" fill="url(#bg)" opacity="${bg.opacity}" />`;
}

function layerToSvg(
  layer: Layer,
  size: number,
  assetUrlOverrides?: Map<string, string>,
): string {
  if (layer.kind === 'icon') {
    const naturalSize = size * 0.4 * layer.scale;
    const cx = layer.x * size;
    const cy = layer.y * size;
    const tx = cx - naturalSize / 2;
    const ty = cy - naturalSize / 2;
    if (layer.color.kind === 'solid') {
      const url = iconUrl(layer.iconset, layer.name, layer.color.color);
      const finalHref = assetUrlOverrides?.get(url) ?? url;
      return [
        `<g transform="rotate(${layer.rotation} ${cx} ${cy})" opacity="${layer.opacity}">`,
        `<image href="${escapeAttr(finalHref)}" x="${tx}" y="${ty}" width="${naturalSize}" height="${naturalSize}" preserveAspectRatio="xMidYMid meet" />`,
        `</g>`,
      ].join('');
    }
    // gradient: mask the white-fill icon and fill a rect through it
    const url = iconUrl(layer.iconset, layer.name, '#ffffff');
    const finalHref = assetUrlOverrides?.get(url) ?? url;
    const maskId = `mask-${layer.id}`;
    const gradId = `grad-${layer.id}`;
    const eps = gradientEndpoints(layer.color.angle);
    return [
      `<g transform="rotate(${layer.rotation} ${cx} ${cy})" opacity="${layer.opacity}">`,
      `<defs>`,
      `<mask id="${maskId}"><image href="${escapeAttr(finalHref)}" x="${tx}" y="${ty}" width="${naturalSize}" height="${naturalSize}" preserveAspectRatio="xMidYMid meet" /></mask>`,
      `<linearGradient id="${gradId}" x1="${eps.x1}" y1="${eps.y1}" x2="${eps.x2}" y2="${eps.y2}"><stop offset="0%" stop-color="${escapeAttr(layer.color.from)}" /><stop offset="100%" stop-color="${escapeAttr(layer.color.to)}" /></linearGradient>`,
      `</defs>`,
      `<rect x="${tx}" y="${ty}" width="${naturalSize}" height="${naturalSize}" fill="url(#${gradId})" mask="url(#${maskId})" />`,
      `</g>`,
    ].join('');
  }
  if (layer.kind === 'text') {
    const fontSize = layer.size * size * layer.scale;
    const cx = layer.x * size;
    const cy = layer.y * size;
    return [
      `<g transform="rotate(${layer.rotation} ${cx} ${cy})" opacity="${layer.opacity}">`,
      `<text x="${cx}" y="${cy}" font-family="${escapeAttr(layer.font)}" font-size="${fontSize}" fill="${escapeAttr(layer.color)}" text-anchor="middle" dominant-baseline="central">${escapeContent(layer.text)}</text>`,
      `</g>`,
    ].join('');
  }
  if (layer.kind === 'image') {
    const naturalSize = size * 0.4 * layer.scale;
    const cx = layer.x * size;
    const cy = layer.y * size;
    const tx = cx - naturalSize / 2;
    const ty = cy - naturalSize / 2;
    const url = `/api/assets/${layer.assetId}/file`;
    const finalHref = assetUrlOverrides?.get(url) ?? url;
    return [
      `<g transform="rotate(${layer.rotation} ${cx} ${cy})" opacity="${layer.opacity}">`,
      `<image href="${escapeAttr(finalHref)}" x="${tx}" y="${ty}" width="${naturalSize}" height="${naturalSize}" preserveAspectRatio="xMidYMid meet" />`,
      `</g>`,
    ].join('');
  }
  return '';
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeContent(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function gradientEndpoints(angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  return {
    x1: `${(0.5 - dx / 2) * 100}%`,
    y1: `${(0.5 - dy / 2) * 100}%`,
    x2: `${(0.5 + dx / 2) * 100}%`,
    y2: `${(0.5 + dy / 2) * 100}%`,
  };
}

// browsers won't fetch externally-href'd <image> children when drawImage rasterizes the svg, so inline them as data uris
async function prefetchAssetDataUris(recipe: Recipe): Promise<Map<string, string>> {
  const seen = new Map<string, string>();
  for (const layer of recipe.layers) {
    let url: string | null = null;
    let defaultMime = 'image/svg+xml';
    if (layer.kind === 'icon') {
      const colorForUrl =
        layer.color.kind === 'solid' ? layer.color.color : '#ffffff';
      url = iconUrl(layer.iconset, layer.name, colorForUrl);
    } else if (layer.kind === 'image') {
      url = `/api/assets/${layer.assetId}/file`;
      defaultMime = 'application/octet-stream';
    }
    if (!url || seen.has(url)) continue;
    try {
      const res = await fetch(url);
      if (!res.ok) {
        console.warn('asset fetch non-OK', res.status, url);
        seen.set(url, url);
        continue;
      }
      const blob = await res.blob();
      const buf = new Uint8Array(await blob.arrayBuffer());
      const mime =
        res.headers.get('content-type') ?? (blob.type || defaultMime);
      const encoded = bytesToBase64(buf);
      seen.set(url, `data:${mime};base64,${encoded}`);
    } catch (err) {
      console.warn('asset fetch failed', err, url);
      seen.set(url, url);
    }
  }
  return seen;
}

function bytesToBase64(bytes: Uint8Array): string {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]!);
  return btoa(s);
}

export async function renderToPng(recipe: Recipe): Promise<Blob> {
  const overrides = await prefetchAssetDataUris(recipe);
  const svg = recipeToSvgString(recipe, overrides);
  const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const objectUrl = URL.createObjectURL(svgBlob);

  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('failed to load SVG image'));
      img.src = objectUrl;
    });

    const canvas = document.createElement('canvas');
    canvas.width = recipe.size;
    canvas.height = recipe.size;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d context unavailable');
    ctx.drawImage(img, 0, 0, recipe.size, recipe.size);

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('canvas.toBlob returned null'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function renderRecipeAtSize(recipe: Recipe, size: Recipe['size']): Promise<Blob> {
  return renderToPng({ ...recipe, size });
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // give the browser a beat to start the download before we yank the url
  setTimeout(() => URL.revokeObjectURL(url), 100);
}
