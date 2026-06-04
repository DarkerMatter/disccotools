import { z } from 'zod';
import { RecipeSchema } from './recipe.js';

/**
 * Lightweight summary for gallery rows — drops the recipe body and stamps a
 * thumbnail URL (relative to the same origin).
 */
export const SaveSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  isTemplate: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  thumbnailUrl: z.string().nullable(),
});
export type SaveSummary = z.infer<typeof SaveSummarySchema>;

/** Full save row, used by GET /:id and after a create/update. */
export const SaveDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  recipe: RecipeSchema,
  isTemplate: z.boolean(),
  renderedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
  thumbnailUrl: z.string().nullable(),
  downloadUrl: z.string().nullable(),
});
export type SaveDetail = z.infer<typeof SaveDetailSchema>;

export const SaveFilterSchema = z.enum(['all', 'designs', 'templates']);
export type SaveFilter = z.infer<typeof SaveFilterSchema>;

export const ListSavesResponseSchema = z.object({
  saves: z.array(SaveSummarySchema),
});
export type ListSavesResponse = z.infer<typeof ListSavesResponseSchema>;

export const SaveResponseSchema = z.object({
  save: SaveDetailSchema,
});
export type SaveResponse = z.infer<typeof SaveResponseSchema>;

export const CreateSaveBodySchema = z.object({
  name: z.string().min(1).max(120),
  recipe: RecipeSchema,
  isTemplate: z.boolean().optional(),
});
export type CreateSaveBody = z.infer<typeof CreateSaveBodySchema>;

export const UpdateSaveBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  recipe: RecipeSchema.optional(),
  isTemplate: z.boolean().optional(),
});
export type UpdateSaveBody = z.infer<typeof UpdateSaveBodySchema>;

export const CloneSaveBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
});
export type CloneSaveBody = z.infer<typeof CloneSaveBodySchema>;

/**
 * Asset library — uploaded image referenced by recipe image layers.
 *
 * The `url` field is a relative path to GET the raw bytes
 * (`/api/assets/{id}/file`) and never embeds origin/scheme so the SPA can use
 * it as-is regardless of deployment.
 */
export const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  url: z.string(),
});
export type Asset = z.infer<typeof AssetSchema>;

export const ListAssetsResponseSchema = z.object({
  assets: z.array(AssetSchema),
});
export type ListAssetsResponse = z.infer<typeof ListAssetsResponseSchema>;

export const AssetResponseSchema = z.object({
  asset: AssetSchema,
});
export type AssetResponse = z.infer<typeof AssetResponseSchema>;

export const RenameAssetBodySchema = z.object({
  name: z.string().min(1).max(120),
});
export type RenameAssetBody = z.infer<typeof RenameAssetBodySchema>;

/** Returned on DELETE when references exist (409). */
export const AssetInUseResponseSchema = z.object({
  error: z.object({
    code: z.literal('CONFLICT'),
    message: z.string(),
    references: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
});
export type AssetInUseResponse = z.infer<typeof AssetInUseResponseSchema>;
