"use strict";

import { type } from "arktype";
import { maxContentLength, maxPollOptionLength, maxMediaDescriptionLength } from "../library.ts";

const sixteen = 16;
const contentLimit = maxContentLength * sixteen;
const pollOptionLimit = maxPollOptionLength * sixteen;
const mediaDescriptionLimit = maxMediaDescriptionLength * sixteen;

export const postCreateBody = type({
	content: type("string").atMostLength(contentLimit).optional(),
	poll: type("string")
		.pipe((value, ctx) => {
			if (!value) {
				return;
			}
			try {
				const parsed = JSON.parse(value) as {
					first: string;
					second: string;
					third?: string;
					fourth?: string;
					duration?: number;
				};
				if (typeof parsed !== "object" || parsed === null) {
					return ctx.error({
						expected: "an object"
					});
				}
				for (const [key, value] of Object.entries(parsed)) {
					switch (key) {
						case "first":
						case "second":
							if (typeof value !== "string") {
								return ctx.error({
									path: [`poll.${key}`],
									actual: value as any,
									expected: "a string"
								});
							}
							if (value.length > pollOptionLimit) {
								return ctx.error({
									path: [`poll.${key}`],
									actual: value,
									expected: `not longer than ${pollOptionLimit} characters`
								});
							}
							break;
						case "third":
						case "fourth":
							if (typeof value !== "undefined" && typeof value !== "string") {
								return ctx.error({
									path: [`poll.${key}`],
									actual: value as any,
									expected: "a string or undefined"
								});
							}
							if (typeof value === "string" && value.length > pollOptionLimit) {
								return ctx.error({
									path: [`poll.${key}`],
									actual: value,
									expected: `not longer than ${pollOptionLimit} characters`
								});
							}
							break;
						case "duration":
							if (typeof value === "undefined") {
								parsed.duration = 86400000;
							} else if (typeof value !== "number" || value < 1800000 || value > 604800000) {
								return ctx.error({
									path: [`poll.${key}`],
									actual: value as any,
									expected: "a number between 1800000 and 604800000"
								});
							}
							break;
						default:
							return ctx.error({
								path: [`poll`],
								actual: Object.keys(parsed).join(", "),
								expected: "an object with valid properties: first, second, third (optional), fourth (optional), duration"
							});
					}
				}
				return parsed;
			} catch {
				return ctx.error({
					expected: "a valid JSON string"
				});
			}
		})
		.optional(),
	media: type("string")
		.configure({
			format: "binary"
		})
		.or("File")
		.optional(),
	"media-description": type("string").atMostLength(mediaDescriptionLimit).optional(),
	location: type("string")
		.pipe((value, ctx) => {
			if (!value) {
				return;
			}
			try {
				const parsed = JSON.parse(value) as {
					type: "Point";
					coordinates: [number, number];
				};
				if (typeof parsed !== "object" || parsed === null) {
					return ctx.error({
						expected: "an object"
					});
				}
				const { type, coordinates } = parsed;
				if (type !== "Point") {
					return ctx.error({
						path: ["location.type"],
						actual: type,
						expected: "Point"
					});
				}
				if (!Array.isArray(coordinates) || coordinates.length !== 2) {
					return ctx.error({
						path: ["location.coordinates"],
						actual: coordinates as any,
						expected: "a [longitude, latitude] tuple"
					});
				}
				const [longitude, latitude] = coordinates;
				if (typeof longitude !== "number" || longitude < -180 || longitude > 180) {
					return ctx.error({
						path: ["location.coordinates[0]"],
						actual: longitude as any,
						expected: "a number between -180 and 180"
					});
				}
				if (typeof latitude !== "number" || latitude < -90 || latitude > 90) {
					return ctx.error({
						path: ["location.coordinates[1]"],
						actual: latitude as any,
						expected: "a number between -90 and 90"
					});
				}
				return parsed;
			} catch {
				return ctx.error({
					expected: "a valid JSON string"
				});
			}
		})
		.optional()
}).pipe((value, ctx) => {
	if (!(value.content?.trim() || value.media)) {
		return ctx.error({
			expected: "an object with either content or media property having a non-empty value"
		});
	}
	if (value.poll && !value.content?.trim()) {
		return ctx.error({
			expected: "an object with content property having a non-empty value when a poll is present"
		});
	}
	return value;
});
export const postInteractParams = type({
	postId: "string"
});
export const postUpdateBody = type({
	content: "string"
});
export const postVoteQuery = type({
	option: type.enumerated("first", "second", "third", "fourth", "nota")
});
export const postQuotesQuery = type({
	lastQuoteId: "string?"
});
export const postRepliesQuery = type({
	lastReplyId: "string?"
});