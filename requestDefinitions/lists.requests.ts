"use strict";

import { type } from "arktype";

export const listsQuery = type({
	memberHandle: "string",
	lastListId: "string?"
});
export const listCreateBody = type({
	name: "string",
	includeRepeats: "boolean = true",
	includeReplies: "boolean = true"
});
export const listUpdateBody = type({
	name: "string",
	newName: "string?",
	includeRepeats: "boolean = true",
	includeReplies: "boolean = true"
});
export const listMemberBody = type({
	name: "string",
	handle: "string"
});
export const listInteractParams = type({
	name: "string"
});
export const listMembersQuery = type({
	lastMemberId: "string?"
});
export const listPostsQuery = type({
	includeRepeats: type("string|boolean").optional(),
	includeReplies: type("string|boolean").optional(),
	lastPostId: "string?"
});