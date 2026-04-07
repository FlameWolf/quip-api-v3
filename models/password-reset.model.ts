"use strict";

import { ObjectId } from "mongodb";
import { Schema, model, Document, Model, type InferSchemaType } from "mongoose";

const passwordResetSchema = new Schema(
	{
		user: { type: ObjectId, ref: "User", required: true, index: true },
		token: { type: ObjectId, required: true }
	},
	{
		timestamps: {
			createdAt: true,
			updatedAt: false
		},
		collation: {
			locale: "en",
			strength: 2
		}
	}
);
passwordResetSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 7 });

export default model<Document, Model<InferSchemaType<typeof passwordResetSchema>>>("PasswordReset", passwordResetSchema);