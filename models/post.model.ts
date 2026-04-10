"use strict";

import { ObjectId } from "mongodb";
import { Schema, SchemaTypes, model, type ValidateOpts } from "mongoose";
import { maxContentLength, maxPollOptionLength, minPollDuration, maxPollDuration, getUnicodeClusterCount } from "../library.ts";

const { Url, Point } = SchemaTypes;
const validatePollOption: ValidateOpts<string, Dictionary> = {
	validator: (value: string) => getUnicodeClusterCount(value) <= maxPollOptionLength,
	message: "Poll option length exceeds the maximum allowed limit"
};
const postSchema = new Schema(
	{
		content: {
			type: String,
			trim: true,
			validate: {
				validator: (value: string) => getUnicodeClusterCount(value) <= maxContentLength,
				message: "Content length exceeds the maximum allowed limit"
			}
		},
		author: { type: ObjectId, ref: "User", required: true, index: true },
		repeatPost: { type: ObjectId, ref: "Post", index: true },
		replyTo: { type: ObjectId, ref: "Post", index: true },
		attachments: new Schema({
			poll: new Schema({
				first: { type: String, trim: true, required: true, validate: validatePollOption },
				second: { type: String, trim: true, required: true, validate: validatePollOption },
				third: { type: String, trim: true, validate: validatePollOption },
				fourth: {
					type: String,
					trim: true,
					validate: [
						{
							validator: function () {
								return Boolean((this as Dictionary).third);
							},
							message: "Cannot specify fourth option when third option is blank"
						},
						validatePollOption
					]
				},
				duration: {
					type: Number,
					min: minPollDuration,
					max: maxPollDuration,
					default: 86400000
				},
				votes: {
					first: { type: Number, default: 0 },
					second: { type: Number, default: 0 },
					third: {
						type: Number,
						default: function () {
							return (this as Dictionary).third && 0;
						}
					},
					fourth: {
						type: Number,
						default: function () {
							return (this as Dictionary).fourth && 0;
						}
					},
					nota: { type: Number, default: 0 }
				}
			}),
			mediaFile: new Schema({
				fileType: {
					type: String,
					enum: ["image", "video"],
					required: true
				},
				src: { type: Url, required: true },
				previewSrc: { type: Url },
				description: { type: String, trim: true }
			}),
			post: { type: ObjectId, ref: "Post", index: true }
		}),
		languages: {
			type: [
				{
					type: String,
					trim: true,
					validate: {
						validator: (value: string) => value.length === 2,
						message: "Language code must be exactly two characters long"
					}
				}
			],
			index: true
		},
		location: { type: Point, index: "2dsphere" },
		mentions: {
			type: [{ type: ObjectId, ref: "User" }],
			default: undefined,
			index: true
		},
		hashtags: {
			type: [{ type: String }],
			default: undefined,
			index: true
		},
		score: {
			type: Number,
			default: 0,
			index: true,
			select: false
		}
	},
	{
		timestamps: true,
		collation: {
			locale: "en",
			strength: 2
		}
	}
);
postSchema.index(
	{
		content: "text"
	},
	{
		default_language: "none",
		collation: {
			locale: "simple"
		}
	}
);
postSchema.index({ createdAt: -1 });

export default model("Post", postSchema);