import { z } from 'zod';
import { RecipeSchema } from './recipe.js';

export const TagsSchema = z.array(z.string().min(1).max(24)).max(8);
export type Tags = z.infer<typeof TagsSchema>;

// recipes are reconstructed client-side from this shape, no R2 PNGs are stored
export const SaveSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.number(),
  updatedAt: z.number(),
  recipe: RecipeSchema,
  tags: TagsSchema,
  shareToken: z.string().nullable(),
});
export type SaveSummary = z.infer<typeof SaveSummarySchema>;

export const SaveDetailSchema = z.object({
  id: z.string(),
  name: z.string(),
  recipe: RecipeSchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  tags: TagsSchema,
  shareToken: z.string().nullable(),
});
export type SaveDetail = z.infer<typeof SaveDetailSchema>;

// Public view of a shared save (no owner identity beyond a display name)
export const SharedSaveSchema = z.object({
  id: z.string(),
  name: z.string(),
  recipe: RecipeSchema,
  tags: TagsSchema,
  ownerName: z.string(),
  createdAt: z.number(),
  shareToken: z.string(),
});
export type SharedSave = z.infer<typeof SharedSaveSchema>;

export const SharedSaveResponseSchema = z.object({
  save: SharedSaveSchema,
});
export type SharedSaveResponse = z.infer<typeof SharedSaveResponseSchema>;

export const ImportSharedSaveBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
});
export type ImportSharedSaveBody = z.infer<typeof ImportSharedSaveBodySchema>;

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
  tags: TagsSchema.optional(),
});
export type CreateSaveBody = z.infer<typeof CreateSaveBodySchema>;

export const UpdateSaveBodySchema = z.object({
  name: z.string().min(1).max(120).optional(),
  recipe: RecipeSchema.optional(),
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

// admin panel DTOs
export const AdminUserSummarySchema = z.object({
  id: z.string(),
  username: z.string(),
  globalName: z.string().nullable(),
  avatarHash: z.string().nullable(),
  permLevel: z.number().int(),
  savesCount: z.number().int(),
  assetsCount: z.number().int(),
});
export type AdminUserSummary = z.infer<typeof AdminUserSummarySchema>;

export const ListAdminUsersResponseSchema = z.object({
  users: z.array(AdminUserSummarySchema),
});
export type ListAdminUsersResponse = z.infer<typeof ListAdminUsersResponseSchema>;

export const AdminActionLogSchema = z.object({
  id: z.string(),
  adminId: z.string(),
  targetUserId: z.string(),
  action: z.string(),
  targetId: z.string().nullable(),
  targetLabel: z.string().nullable(),
  reason: z.string(),
  createdAt: z.number(),
  acknowledgedAt: z.number().nullable(),
});
export type AdminActionLog = z.infer<typeof AdminActionLogSchema>;

export const AdminUserDetailResponseSchema = z.object({
  user: AdminUserSummarySchema,
  assets: z.array(AssetSchema),
  saves: z.array(SaveSummarySchema),
  actions: z.array(AdminActionLogSchema),
});
export type AdminUserDetailResponse = z.infer<typeof AdminUserDetailResponseSchema>;

export const AdminReasonBodySchema = z.object({
  reason: z.string().min(1).max(500),
});
export type AdminReasonBody = z.infer<typeof AdminReasonBodySchema>;

export const AdminSetPermBodySchema = z.object({
  level: z.number().int().min(0).max(10),
  reason: z.string().min(1).max(500),
});
export type AdminSetPermBody = z.infer<typeof AdminSetPermBodySchema>;

export const AdminAssetRowSchema = AssetSchema.extend({
  userId: z.string(),
});
export type AdminAssetRow = z.infer<typeof AdminAssetRowSchema>;

export const ListAdminAssetsResponseSchema = z.object({
  assets: z.array(AdminAssetRowSchema),
});
export type ListAdminAssetsResponse = z.infer<typeof ListAdminAssetsResponseSchema>;

export const AdminSaveRowSchema = SaveSummarySchema.extend({
  userId: z.string(),
});
export type AdminSaveRow = z.infer<typeof AdminSaveRowSchema>;

export const ListAdminSavesResponseSchema = z.object({
  saves: z.array(AdminSaveRowSchema),
});
export type ListAdminSavesResponse = z.infer<typeof ListAdminSavesResponseSchema>;

export const AdminCustomIconSchema = z.object({
  key: z.string(),
  category: z.string(),
  basename: z.string(),
  sizeBytes: z.number().int(),
  uploadedAt: z.number(),
});
export type AdminCustomIcon = z.infer<typeof AdminCustomIconSchema>;

export const ListAdminCustomIconsResponseSchema = z.object({
  icons: z.array(AdminCustomIconSchema),
});
export type ListAdminCustomIconsResponse = z.infer<
  typeof ListAdminCustomIconsResponseSchema
>;
