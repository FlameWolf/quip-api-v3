"use strict";

import { ObjectId } from "mongodb";
import { Schema, model, Document, Model, type InferSchemaType } from "mongoose";
import uniqueValidator from "mongoose-unique-validator";

const settingsSchema = new Schema(
	{
		user: { type: ObjectId, ref: "User", index: true, unique: true },
		timeline: new Schema({
			includeRepeats: { type: Boolean, default: true },
			includeReplies: { type: Boolean, default: true }
		}),
		activity: new Schema({
			period: {
				type: String,
				enum: ["day", "week", "month"],
				default: "day"
			}
		}),
		topmost: new Schema({
			period: {
				type: String,
				enum: ["day", "week", "month", "year", "all"],
				default: "day"
			}
		}),
		profile: new Schema({
			includeRepeats: { type: Boolean, default: false },
			includeReplies: { type: Boolean, default: false }
		}),
		ui: new Schema({
			theme: {
				type: String,
				enum: ["light", "dark"],
				default: "light"
			},
			lang: {
				type: String,
				trim: true,
				validate: {
					validator: (value: string) => value.length === 2,
					message: "Language code must be exactly two characters long"
				}
			}
		})
	},
	{
		timestamps: {
			createdAt: false,
			updatedAt: true
		},
		collation: {
			locale: "en",
			strength: 2
		}
	}
);
settingsSchema.plugin(uniqueValidator);

export default model<Document, Model<InferSchemaType<typeof settingsSchema>>>("Settings", settingsSchema);