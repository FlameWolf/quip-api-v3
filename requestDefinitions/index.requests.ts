"use strict";

import { type } from "arktype";

export const timelineQuery = type({
	includeRepeats: type("string|boolean").optional(),
	includeReplies: type("string|boolean").optional(),
	lastPostId: "string?"
});
export const activityParams = type({
	period: type.enumerated("day", "week", "month").optional()
});
export const activityQuery = type({
	lastEntryId: "string?"
});
export const topmostParams = type({
	period: type.enumerated("day", "week", "month", "year", "all").optional()
});
export const topmostQuery = type({
	lastScore: "number?",
	lastPostId: "string?"
});
export const hashtagParams = type({
	name: "string"
});
export const hashtagQuery = type({
	sortBy: type.enumerated("date", "popular").optional(),
	lastScore: "number?",
	lastPostId: "string?"
});
export const emailApprovalParams = type({
	token: "string"
});
export const forgotPasswordBody = type({
	handle: "string",
	email: "string"
});
export const resetPasswordParams = type({
	token: "string"
});
export const resetPasswordBody = type({
	password: "string"
});