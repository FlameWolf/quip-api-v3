"use strict";

import { ObjectId } from "mongodb";
import { Schema, model, Document, Model, type InferSchemaType } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const followRequestSchema = new Schema(
	{
		user: { type: ObjectId, ref: "User", required: true, index: true },
		requestedBy: { type: ObjectId, ref: "User", required: true }
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
followRequestSchema.index({ user: 1, requestedBy: 1 }, { unique: true });
followRequestSchema.plugin(uniqueValidator);

export default model<Document, Model<InferSchemaType<typeof followRequestSchema>>>("FollowRequest", followRequestSchema);