"use strict";

import { ObjectId } from "mongodb";
import { Schema, model } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const voteSchema = new Schema(
	{
		poll: { type: ObjectId, ref: "Post.attachments.poll", required: true, index: true },
		user: { type: ObjectId, ref: "User", required: true },
		option: {
			type: String,
			enum: ["first", "second", "third", "fourth", "nota"],
			required: true
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
voteSchema.index({ user: 1, poll: 1 }, { unique: true });
voteSchema.plugin(uniqueValidator);

export default model("Vote", voteSchema);