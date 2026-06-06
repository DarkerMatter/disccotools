import type { Shape } from './recipe.js';

export const SHAPES_FOR_UI: readonly Shape[] = [
  'circle',
  'rounded-square',
  'scalloped',
  'gear',
  'shield-rounded-pointed',
  'shield-flat-pointed',
  'shield-narrow-pointed',
  'shield-rounded-curved',
  'shield-wide-curved',
  'banner',
  'hexagon',
  'diamond',
  'star',
  'triangle',
];

export const SHAPE_LABELS: Record<Shape, string> = {
  'circle': 'Circle',
  'square': 'Square',
  'rounded-square': 'Rounded square',
  'scalloped': 'Scalloped',
  'gear': 'Gear',
  'shield-rounded-pointed': 'Shield (rounded)',
  'shield-flat-pointed': 'Shield (flat top)',
  'shield-narrow-pointed': 'Shield (narrow)',
  'shield-rounded-curved': 'Shield (curved)',
  'shield-wide-curved': 'Shield (wide)',
  'banner': 'Banner',
  'hexagon': 'Hexagon',
  'diamond': 'Diamond',
  'star': 'Star',
  'triangle': 'Triangle',
};

function circlePathD(size: number): string {
  const r = size / 2;
  const cx = size / 2;
  const cy = size / 2;
  return `M ${cx - r},${cy} A ${r},${r} 0 1,0 ${cx + r},${cy} A ${r},${r} 0 1,0 ${cx - r},${cy} Z`;
}

function squarePathD(size: number): string {
  return `M 0,0 L ${size},0 L ${size},${size} L 0,${size} Z`;
}

function roundedSquarePathD(size: number): string {
  const r = size * 0.2;
  return [
    `M ${r},0`,
    `L ${size - r},0`,
    `Q ${size},0 ${size},${r}`,
    `L ${size},${size - r}`,
    `Q ${size},${size} ${size - r},${size}`,
    `L ${r},${size}`,
    `Q 0,${size} 0,${size - r}`,
    `L 0,${r}`,
    `Q 0,0 ${r},0`,
    'Z',
  ].join(' ');
}

function scallopedPathD(size: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const innerR = size * 0.42;
  const outerR = size / 2;
  const lobes = 12;
  let d = '';
  for (let i = 0; i < lobes; i++) {
    const a0 = (i / lobes) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / lobes) * 2 * Math.PI - Math.PI / 2;
    const am = (a0 + a1) / 2;
    const x0 = cx + innerR * Math.cos(a0);
    const y0 = cy + innerR * Math.sin(a0);
    const x1 = cx + innerR * Math.cos(a1);
    const y1 = cy + innerR * Math.sin(a1);
    const xm = cx + outerR * Math.cos(am);
    const ym = cy + outerR * Math.sin(am);
    if (i === 0) d += `M ${x0},${y0}`;
    d += ` Q ${xm},${ym} ${x1},${y1}`;
  }
  return d + ' Z';
}

function gearPathD(size: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2;
  const innerR = size * 0.4;
  const teeth = 12;
  const pts: string[] = [];
  for (let i = 0; i < teeth * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = (i / (teeth * 2)) * 2 * Math.PI - Math.PI / 2;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

function shieldRoundedPointedPathD(size: number): string {
  const s = size;
  return [
    `M ${s * 0.1},${s * 0.0}`,
    `L ${s * 0.9},${s * 0.0}`,
    `Q ${s * 1.0},${s * 0.0} ${s * 1.0},${s * 0.1}`,
    `L ${s * 1.0},${s * 0.55}`,
    `Q ${s * 1.0},${s * 0.9} ${s * 0.5},${s * 1.0}`,
    `Q ${s * 0.0},${s * 0.9} ${s * 0.0},${s * 0.55}`,
    `L ${s * 0.0},${s * 0.1}`,
    `Q ${s * 0.0},${s * 0.0} ${s * 0.1},${s * 0.0}`,
    'Z',
  ].join(' ');
}

function shieldFlatPointedPathD(size: number): string {
  const s = size;
  return [
    `M ${s * 0.0},${s * 0.0}`,
    `L ${s * 1.0},${s * 0.0}`,
    `L ${s * 1.0},${s * 0.55}`,
    `Q ${s * 1.0},${s * 0.9} ${s * 0.5},${s * 1.0}`,
    `Q ${s * 0.0},${s * 0.9} ${s * 0.0},${s * 0.55}`,
    `L ${s * 0.0},${s * 0.0}`,
    'Z',
  ].join(' ');
}

function shieldNarrowPointedPathD(size: number): string {
  const s = size;
  return [
    `M ${s * 0.15},${s * 0.05}`,
    `L ${s * 0.85},${s * 0.05}`,
    `L ${s * 0.85},${s * 0.5}`,
    `Q ${s * 0.85},${s * 0.85} ${s * 0.5},${s * 1.0}`,
    `Q ${s * 0.15},${s * 0.85} ${s * 0.15},${s * 0.5}`,
    `L ${s * 0.15},${s * 0.05}`,
    'Z',
  ].join(' ');
}

function shieldRoundedCurvedPathD(size: number): string {
  const s = size;
  return [
    `M ${s * 0.1},${s * 0.0}`,
    `L ${s * 0.9},${s * 0.0}`,
    `Q ${s * 1.0},${s * 0.0} ${s * 1.0},${s * 0.15}`,
    `Q ${s * 1.0},${s * 0.5} ${s * 1.0},${s * 0.6}`,
    `Q ${s * 1.0},${s * 0.9} ${s * 0.5},${s * 1.0}`,
    `Q ${s * 0.0},${s * 0.9} ${s * 0.0},${s * 0.6}`,
    `Q ${s * 0.0},${s * 0.5} ${s * 0.0},${s * 0.15}`,
    `Q ${s * 0.0},${s * 0.0} ${s * 0.1},${s * 0.0}`,
    'Z',
  ].join(' ');
}

function shieldWideCurvedPathD(size: number): string {
  const s = size;
  return [
    `M ${s * 0.0},${s * 0.0}`,
    `L ${s * 1.0},${s * 0.0}`,
    `Q ${s * 0.95},${s * 0.5} ${s * 0.9},${s * 0.7}`,
    `Q ${s * 0.75},${s * 0.95} ${s * 0.5},${s * 1.0}`,
    `Q ${s * 0.25},${s * 0.95} ${s * 0.1},${s * 0.7}`,
    `Q ${s * 0.05},${s * 0.5} ${s * 0.0},${s * 0.0}`,
    'Z',
  ].join(' ');
}

function bannerPathD(size: number): string {
  return [
    `M 0,0`,
    `L ${size},0`,
    `L ${size},${size * 0.65}`,
    `L ${size / 2},${size}`,
    `L 0,${size * 0.65}`,
    'Z',
  ].join(' ');
}

function hexagonPathD(size: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

function diamondPathD(size: number): string {
  return [
    `M ${size / 2},0`,
    `L ${size},${size / 2}`,
    `L ${size / 2},${size}`,
    `L 0,${size / 2}`,
    'Z',
  ].join(' ');
}

function starPathD(size: number): string {
  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2;
  const innerR = size * 0.22;
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`);
  }
  return `M ${pts.join(' L ')} Z`;
}

function trianglePathD(size: number): string {
  return `M ${size / 2},0 L ${size},${size} L 0,${size} Z`;
}

export function shapePathD(shape: Shape, size: number): string {
  switch (shape) {
    case 'circle': return circlePathD(size);
    case 'square': return squarePathD(size);
    case 'rounded-square': return roundedSquarePathD(size);
    case 'scalloped': return scallopedPathD(size);
    case 'gear': return gearPathD(size);
    case 'shield-rounded-pointed': return shieldRoundedPointedPathD(size);
    case 'shield-flat-pointed': return shieldFlatPointedPathD(size);
    case 'shield-narrow-pointed': return shieldNarrowPointedPathD(size);
    case 'shield-rounded-curved': return shieldRoundedCurvedPathD(size);
    case 'shield-wide-curved': return shieldWideCurvedPathD(size);
    case 'banner': return bannerPathD(size);
    case 'hexagon': return hexagonPathD(size);
    case 'diamond': return diamondPathD(size);
    case 'star': return starPathD(size);
    case 'triangle': return trianglePathD(size);
  }
}
