// Serialize Mongo documents exposing `id` (string) instead of `_id`/`__v`.
export function stripMongoId(_doc: unknown, ret: Record<string, unknown>): void {
  delete ret._id;
}

// toJSON options shared by the schemas (the `id` virtual replaces `_id`/`__v`).
export const ID_TRANSFORM = {
  virtuals: true,
  versionKey: false,
  transform: stripMongoId,
};
