import { z } from 'zod';

/** A hex color string, e.g. "#5865F2". Validation is intentionally permissive — */
/** we accept any CSS color string for now (UI can enforce stricter input). */
export const ColorSchema = z.string().min(1);

/** Export resolution. Discord role icons are usually small; we allow up to 1024. */
export const SizeSchema = z.union([
  z.literal(32),
  z.literal(64),
  z.literal(128),
  z.literal(256),
  z.literal(512),
  z.literal(1024),
]);
export type Size = z.infer<typeof SizeSchema>;

/** A 0–1 opacity. */
export const OpacitySchema = z.number().min(0).max(1);

/** Background variants. */
export const BackgroundSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('transparent') }),
  z.object({
    kind: z.literal('solid'),
    color: ColorSchema,
    opacity: OpacitySchema,
  }),
  z.object({
    kind: z.literal('gradient'),
    from: ColorSchema,
    to: ColorSchema,
    angle: z.number(), // degrees, 0–360
    opacity: OpacitySchema,
  }),
]);
export type Background = z.infer<typeof BackgroundSchema>;

/** Clip shape applied to the whole canvas. */
export const ShapeSchema = z.enum([
  'circle',
  'square',                       // legacy — kept for back-compat, hidden in UI
  'rounded-square',
  'scalloped',                    // wavy-edged flower/badge
  'gear',                         // spiky-edged cog/seal
  'shield-rounded-pointed',       // rounded top, pointed bottom
  'shield-flat-pointed',          // flat top, pointed bottom
  'shield-narrow-pointed',        // narrower, pointed bottom
  'shield-rounded-curved',        // rounded top, slightly curved sides
  'shield-wide-curved',           // wider, curved sides, pointed bottom
  'banner',                       // flat top, pointed bottom (shield with straight sides)
  'hexagon',
  'diamond',
  'star',                         // 5-pointed
  'triangle',                     // pointing up
]);
export type Shape = z.infer<typeof ShapeSchema>;

/** Shared layer transform / identity fields. */
export const LayerBaseSchema = z.object({
  id: z.string().min(1),     // UUID v4 generated client-side
  x: z.number(),             // 0–1 normalized to canvas size
  y: z.number(),             // 0–1 normalized
  rotation: z.number(),      // degrees
  scale: z.number().positive(), // multiplier; 1 = "natural"
  opacity: OpacitySchema,
});

/**
 * Icon fill color. Accepts either a legacy bare string (treated as a solid),
 * or a structured object describing a solid OR a two-stop linear gradient.
 *
 * The Zod transform always normalizes the parsed result to the structured
 * `{ kind: 'solid' | 'gradient', ... }` form so consumers don't have to
 * handle the legacy string at runtime.
 */
export const IconColorSchema = z
  .union([
    z.string().min(1),
    z.object({ kind: z.literal('solid'), color: ColorSchema }),
    z.object({
      kind: z.literal('gradient'),
      from: ColorSchema,
      to: ColorSchema,
      angle: z.number(),
    }),
  ])
  .transform((value) =>
    typeof value === 'string'
      ? ({ kind: 'solid' as const, color: value })
      : value,
  );

export type IconColor =
  | { kind: 'solid'; color: string }
  | { kind: 'gradient'; from: string; to: string; angle: number };

/** Layer kind: Iconify icon (icon set + name + color). */
export const IconLayerSchema = LayerBaseSchema.extend({
  kind: z.literal('icon'),
  iconset: z.string().min(1),  // e.g. "lucide", "tabler"
  name: z.string().min(1),     // e.g. "rocket"
  color: IconColorSchema,
});
export type IconLayer = z.infer<typeof IconLayerSchema>;

/** Layer kind: text. */
export const TextLayerSchema = LayerBaseSchema.extend({
  kind: z.literal('text'),
  text: z.string().max(200),
  font: z.string().min(1).max(120), // CSS font-family
  color: ColorSchema,
  size: z.number().positive(),      // font-size in "design units" (0–1 of canvas)
});
export type TextLayer = z.infer<typeof TextLayerSchema>;

/** Layer kind: image (custom upload, referenced by asset id). */
/** Used in Phase 5; reserved here so the schema is complete. */
export const ImageLayerSchema = LayerBaseSchema.extend({
  kind: z.literal('image'),
  assetId: z.string().min(1),
});
export type ImageLayer = z.infer<typeof ImageLayerSchema>;

export const LayerSchema = z.discriminatedUnion('kind', [
  IconLayerSchema,
  TextLayerSchema,
  ImageLayerSchema,
]);
export type Layer = z.infer<typeof LayerSchema>;

/** The full recipe — what the editor mutates and the worker stores. */
export const RecipeSchema = z.object({
  version: z.literal(1),
  size: SizeSchema,
  background: BackgroundSchema,
  shape: ShapeSchema,
  layers: z.array(LayerSchema).max(50),
});
export type Recipe = z.infer<typeof RecipeSchema>;

export const RECIPE_VERSION = 1 as const;
export const DEFAULT_SIZE: Size = 256;
export const MAX_LAYERS = 50;

/** Initial recipe for a fresh editor session. */
export function createEmptyRecipe(): Recipe {
  return {
    version: RECIPE_VERSION,
    size: DEFAULT_SIZE,
    background: {
      kind: 'solid',
      color: '#5865F2',
      opacity: 1,
    },
    shape: 'circle',
    layers: [],
  };
}
