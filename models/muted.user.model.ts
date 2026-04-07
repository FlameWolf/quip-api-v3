"use strict";

import { ObjectId } from "mongodb";
import { Schema, model, Document, Model, type InferSchemaType } from "mongoose";
import { getUnicodeClusterCount, maxContentLength } from "../library.ts";
import uniqueValidator from "mongoose-unique-validator";

const mutedUserSchema = new Schema(
	{
		user: { type: ObjectId, ref: "User", required: true, index: true },
		mutedBy: { type: ObjectId, ref: "User", required: true },
		reason: {
			type: String,
			trim: true,
			validate: {
				validator: (value: string) => getUnicodeClusterCount(value) <= maxContentLength,
				message: "Reason length exceeds the maximum allowed limit"
			}
		}
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
mutedUserSchema.index({ mutedBy: 1, user: 1 }, { unique: true });
mutedUserSchema.plugin(uniqueValidator);

export default model<Document, Model<InferSchemaType<typeof mutedUserSchema>>>("MutedUser", mutedUserSchema);