import { z } from 'zod';

export const ColorSchema = z.string().min(1);

export const SizeSchema = z.union([
  z.literal(32),
  z.literal(64),
  z.literal(128),
  z.literal(256),
  z.literal(512),
  z.literal(1024),
]);
export type Size = z.infer<typeof SizeSchema>;

export const OpacitySchema = z.number().min(0).max(1);

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
    angle: z.number(),
    opacity: OpacitySchema,
  }),
]);
export type Background = z.infer<typeof BackgroundSchema>;

export const ShapeSchema = z.enum([
  'none',
  'circle',
  'square',
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
]);
export type Shape = z.infer<typeof ShapeSchema>;

export const LayerBaseSchema = z.object({
  id: z.string().min(1),
  x: z.number(),
  y: z.number(),
  rotation: z.number(),
  scale: z.number().positive(),
  opacity: OpacitySchema,
});

// legacy string colors parse as solid; output is always the structured form
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

export const IconLayerSchema = LayerBaseSchema.extend({
  kind: z.literal('icon'),
  iconset: z.string().min(1),
  name: z.string().min(1),
  color: IconColorSchema,
});
export type IconLayer = z.infer<typeof IconLayerSchema>;

export const TextLayerSchema = LayerBaseSchema.extend({
  kind: z.literal('text'),
  text: z.string().max(200),
  font: z.string().min(1).max(120),
  color: ColorSchema,
  size: z.number().positive(),
});
export type TextLayer = z.infer<typeof TextLayerSchema>;

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

export const RecipeSchema = z.object({
  version: z.literal(1),
  size: SizeSchema,
  background: BackgroundSchema,
  shape: ShapeSchema,
  // older saves don't include this; default keeps them rendering the same way
  shapeRotation: z.number().default(0),
  layers: z.array(LayerSchema).max(50),
});
export type Recipe = z.infer<typeof RecipeSchema>;

export const RECIPE_VERSION = 1 as const;
export const DEFAULT_SIZE: Size = 256;
export const MAX_LAYERS = 50;

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
    shapeRotation: 0,
    layers: [],
  };
}
