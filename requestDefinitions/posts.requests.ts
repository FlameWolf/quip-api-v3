"use strict";

import { type } from "arktype";

export const postCreateBody = type({
	content: "string",
	poll: type("string")
		.pipe(value => {
			const parsed = JSON.parse(value) as {
				first: string;
				second: string;
				third?: string;
				fourth?: string;
				duration: number;
			};
			const isValid = (() => {
				if (typeof parsed === "object" && parsed !== null) {
					if (typeof parsed.first !== "string") {
						return false;
					}
					if (typeof parsed.second !== "string") {
						return false;
					}
					if (typeof parsed.third !== "undefined" && typeof parsed.third !== "string") {
						return false;
					}
					if (typeof parsed.fourth !== "undefined" && typeof parsed.fourth !== "string") {
						return false;
					}
					if (typeof parsed.duration !== "number" || parsed.duration < 1800000 || parsed.duration > 604800000) {
						return false;
					}
				}
				return true;
			})();
			if (isValid) {
				return parsed;
			} else {
				throw new Error("Invalid poll object");
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
	location: type({
		type: type.enumerated("Point"),
		coordinates: type("number").atLeast(-180).atMost(180).array().exactlyLength(2)
	})
		.array()
		.exactlyLength(2)
		.optional()
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