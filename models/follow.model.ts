"use strict";

import { ObjectId } from "mongodb";
import { Schema, model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const followSchema = new Schema(
	{
		user: { type: ObjectId, ref: "User", required: true, index: true },
		followedBy: { type: ObjectId, ref: "User", required: true }
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
followSchema.index({ followedBy: 1, user: 1 }, { unique: true });
followSchema.plugin(uniqueValidator);

export default model("Follow", followSchema);