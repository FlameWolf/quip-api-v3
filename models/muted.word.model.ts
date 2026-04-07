"use strict";

import { ObjectId } from "mongodb";
import { Schema, model, Document, Model, type InferSchemaType } from "mongoose";
import { maxMutedWordLength, escapeRegExp, getUnicodeClusterCount } from "../library.ts";
import uniqueValidator from "mongoose-unique-validator";

const mutedWordSchema = new Schema(
	{
		word: {
			type: String,
			trim: true,
			required: true,
			set: (value: string) => escapeRegExp(value),
			validate: {
				validator: (value: string) => getUnicodeClusterCount(value) <= maxMutedWordLength,
				message: "Word length exceeds the maximum allowed limit"
			},
			index: true
		},
		match: {
			type: String,
			enum: ["exact", "contains", "startsWith", "endsWith"],
			required: true,
			index: true
		},
		mutedBy: { type: ObjectId, ref: "User", required: true }
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
mutedWordSchema.index({ mutedBy: 1, word: 1, match: 1 }, { unique: true });
mutedWordSchema.plugin(uniqueValidator);

export default model<Document, Model<InferSchemaType<typeof mutedWordSchema>>>("MutedWord", mutedWordSchema);