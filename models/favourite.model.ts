"use strict";

import { ObjectId } from "mongodb";
import { Schema, model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const favouriteSchema = new Schema(
	{
		post: { type: ObjectId, ref: "Post", required: true, index: true },
		favouritedBy: { type: ObjectId, ref: "User", required: true }
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
favouriteSchema.index({ favouritedBy: 1, post: 1 }, { unique: true });
favouriteSchema.plugin(uniqueValidator);

export default model("Favourite", favouriteSchema);