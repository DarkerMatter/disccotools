import { z } from 'zod';
import { RecipeSchema } from './recipe.js';

export const TagsSchema = z.array(z.string().min(1).max(24)).max(8);
export type Tags = z.infer<typeof TagsSchema>;

// recipes are reconstructed client-side from this shape, no R2 PNGs are stored
export const SaveSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  isTemplate: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  recipe: RecipeSchema,
  tags: TagsSchema,
  parentTemplateId: z.string().nullable(),
  shareToken: z.string().nullable(),
});
export type SaveSummary = z.infer<typeof SaveSummarySchema>;

export const SaveDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  recipe: RecipeSchema,
  isTemplate: z.boolean(),
  createdAt: z.number(),
  updatedAt: z.number(),
  tags: TagsSchema,
  parentTemplateId: z.string().nullable(),
  shareToken: z.string().nullable(),
});
export type SaveDetail = z.infer<typeof SaveDetailSchema>;

// Public view of a shared template (no owner identity beyond a display name)
export const SharedTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  recipe: RecipeSchema,
  tags: TagsSchema,
  ownerName: z.string(),
  createdAt: z.number(),
  shareToken: z.string(),
});
export type SharedTemplate = z.infer<typeof SharedTemplateSchema>;

export const SharedTemplateResponseSchema = z.object({
  template: SharedTemplateSchema,
});
export type SharedTemplateResponse = z.infer<typeof SharedTemplateResponseSchema>;

export const UseTemplateBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
});
export type UseTemplateBody = z.infer<typeof UseTemplateBodySchema>;

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

export const UpdateAssetBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  tags: TagsSchema.optional(),
});
export type UpdateAssetBody = z.infer<typeof UpdateAssetBodySchema>;

export const RenameAssetBodySchema = UpdateAssetBodySchema;
export type RenameAssetBody = UpdateAssetBody;

export const AssetInUseResponseSchema = z.object({
  error: z.object({
    code: z.literal('CONFLICT'),
    message: z.string(),
    references: z.array(z.object({ id: z.string(), name: z.string() })),
  }),
});
export type AssetInUseResponse = z.infer<typeof AssetInUseResponseSchema>;
