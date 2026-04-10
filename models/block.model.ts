"use strict";

import { ObjectId } from "mongodb";
import { Schema, model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";
import { maxContentLength, getUnicodeClusterCount } from "../library.ts";

const blockSchema = new Schema(
	{
		user: { type: ObjectId, ref: "User", required: true, index: true },
		blockedBy: { type: ObjectId, ref: "User", required: true },
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
blockSchema.index({ blockedBy: 1, user: 1 }, { unique: true });
blockSchema.plugin(uniqueValidator);

export default model("Block", blockSchema);