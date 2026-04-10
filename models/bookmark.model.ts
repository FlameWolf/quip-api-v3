"use strict";

import { ObjectId } from "mongodb";
import { Schema, model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const bookmarkSchema = new Schema(
	{
		post: { type: ObjectId, ref: "Post", required: true, index: true },
		bookmarkedBy: { type: ObjectId, ref: "User", required: true }
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
bookmarkSchema.index({ bookmarkedBy: 1, post: 1 }, { unique: true });
bookmarkSchema.plugin(uniqueValidator);

export default model("Bookmark", bookmarkSchema);