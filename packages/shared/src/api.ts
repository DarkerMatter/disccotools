import { z } from 'zod';
import { RecipeSchema } from './recipe.js';

/**
 * Tag list for a save or asset. Flat array of short strings, lowercased
 * on storage. Capped at 8 entries, each up to 24 chars.
 */
export const TagsSchema = z.array(z.string().min(1).max(24)).max(8);
export type Tags = z.infer<typeof TagsSchema>;

/** Gallery-row summary: no recipe body, just a same-origin thumbnail URL. */
export const SaveSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  isTemplate: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  thumbnailUrl: z.string().nullable(),
  tags: TagsSchema,
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
  tags: TagsSchema,
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
  tags: TagsSchema.optional(),
});
export type CreateSaveBody = z.infer<typeof CreateSaveBodySchema>;

export const UpdateSaveBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  recipe: RecipeSchema.optional(),
  isTemplate: z.boolean().optional(),
  tags: TagsSchema.optional(),
});
export type UpdateSaveBody = z.infer<typeof UpdateSaveBodySchema>;

export const CloneSaveBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
});
export type CloneSaveBody = z.infer<typeof CloneSaveBodySchema>;

/**
 * Asset library entry: uploaded image referenced by recipe image layers.
 * `url` is a relative path so the SPA uses it as-is across deployments.
 */
export const AssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  url: z.string(),
  tags: TagsSchema,
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

/**
 * PATCH body for an asset. Originally rename-only; now also accepts a tags
 * patch. The legacy `RenameAssetBody` alias is kept so the SPA's existing
 * imports keep working until they migrate to `UpdateAssetBody`.
 */
export const UpdateAssetBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tags: TagsSchema.optional(),
});
export type UpdateAssetBody = z.infer<typeof UpdateAssetBodySchema>;

/** Legacy name for the asset PATCH body. New code should use `UpdateAssetBodySchema`. */
export const RenameAssetBodySchema = UpdateAssetBodySchema;
export type RenameAssetBody = UpdateAssetBody;

/** Returned on DELETE when references exist (409). */
export const AssetInUseResponseSchema = z.object({
  error: z.object({
    code: z.literal('CONFLICT'),
    message: z.string(),
    references: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
});
export type AssetInUseResponse = z.infer<typeof AssetInUseResponseSchema>;
