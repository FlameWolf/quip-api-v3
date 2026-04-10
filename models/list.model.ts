"use strict";

import { ObjectId } from "mongodb";
import { Schema, model } from "mongoose";
import { handleRegExp } from "../library.ts";
import uniqueValidator from "mongoose-unique-validator";

const listSchema = new Schema(
	{
		name: {
			type: String,
			trim: true,
			required: true,
			validate: {
				validator: (value: string) => handleRegExp.test(value),
				message: "List name is not valid"
			}
		},
		owner: { type: ObjectId, ref: "User", required: true },
		includeRepeats: { type: Boolean, default: true },
		includeReplies: { type: Boolean, default: true },
		members: { type: [ObjectId], select: false }
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
listSchema.index({ owner: 1, name: 1 }, { unique: true });
listSchema.plugin(uniqueValidator);

export default model("List", listSchema);