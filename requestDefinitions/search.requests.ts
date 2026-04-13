"use strict";

import { type } from "arktype";

export const searchQuery = type({
	q: "string?",
	from: "string?",
	since: "string?",
	until: "string?",
	"has-media": "string?",
	"not-from": "string?",
	"sort-by": type.enumerated("match", "date", "popular").optional(),
	"date-order": type.enumerated("desc", "asc").optional(),
	replies: type.enumerated("exclude", "only").optional(),
	langs: "string?",
	"langs-match": type.enumerated("any", "all").optional(),
	"media-desc": "string?",
	lastScore: "number?",
	lastPostId: "string?"
});
export const searchNearbyQuery = type({
	long: "number",
	lat: "number",
	"max-dist": type("number.integer").atLeast(0).atMost(50000).optional(),
	lastDistance: "number?",
	lastPostId: "string?"
});
export const searchUsersQuery = type({
	q: "string",
	match: type.enumerated("exact", "contains", "startsWith", "endsWith").optional(),
	"date-order": type.enumerated("desc", "asc").optional(),
	lastUserId: "string?"
});