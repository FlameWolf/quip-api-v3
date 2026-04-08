"use strict";

import { type } from "arktype";

export const postCreateBody = type({
	content: "string?",
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
				const { first, second, third, fourth, duration } = parsed as {
					first: string;
					second: string;
					third?: string;
					fourth?: string;
					duration?: number;
				};
				if (typeof first !== "string") {
					return ctx.error({
						path: ["poll.first"],
						actual: first,
						expected: "a string"
					});
				}
				if (typeof second !== "string") {
					return ctx.error({
						path: ["poll.second"],
						actual: second,
						expected: "a string"
					});
				}
				if (typeof third !== "undefined" && typeof third !== "string") {
					return ctx.error({
						path: ["poll.third"],
						actual: third,
						expected: "a string or undefined"
					});
				}
				if (typeof fourth !== "undefined" && typeof fourth !== "string") {
					return ctx.error({
						path: ["poll.fourth"],
						actual: fourth,
						expected: "a string or undefined"
					});
				}
				if (typeof duration === "undefined") {
					parsed.duration = 86400000;
				} else if (typeof duration !== "number" || duration < 1800000 || duration > 604800000) {
					return ctx.error({
						path: ["poll.duration"],
						actual: duration as any,
						expected: "a number between 1800000 and 604800000"
					});
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
	"media-description": "string?",
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
	if (!(value.content || value.media)) {
		return ctx.error({
			expected: "either content or media to be provided"
		});
	}
	if (value.poll && !value.content) {
		return ctx.error({
			expected: "content to be provided when creating a poll"
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

export type PostCreateBody = typeof postCreateBody.inferOut;
export type PostInteractParams = typeof postInteractParams.inferOut;
export type PostUpdateBody = typeof postUpdateBody.inferOut;
export type PostVoteQuery = typeof postVoteQuery.inferOut;
export type PostQuotesQuery = typeof postQuotesQuery.inferOut;
export type PostRepliesQuery = typeof postRepliesQuery.inferOut;