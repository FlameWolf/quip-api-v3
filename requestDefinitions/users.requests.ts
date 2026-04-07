"use strict";

import { type } from "arktype";

export const userInteractParams = type({
	handle: "string"
});
export const actionReasonQuery = type({
	reason: "string"
});
export const userPostsQuery = type({
	includeRepeats: type("string|boolean").optional(),
	includeReplies: type("string|boolean").optional(),
	lastPostId: "string?"
});
export const userTopmostParams = userInteractParams.and(
	type({
		period: type.enumerated("day", "week", "month", "year", "all").optional()
	})
);
export const userTopmostQuery = type({
	lastScore: "number.integer?",
	lastPostId: "string?"
});
export const userFavouritesQuery = type({
	lastFavouriteId: "string?"
});
export const userVotesQuery = type({
	lastVoteId: "string?"
});
export const userBookmarksQuery = type({
	lastBookmarkId: "string?"
});
export const userFollowsQuery = type({
	lastFollowId: "string?"
});
export const userFollowRequestsQuery = type({
	lastFollowRequestId: "string?"
});
export const userMentionsQuery = type({
	lastMentionId: "string?"
});

export type UserInteractParams = typeof userInteractParams.inferOut;
export type ActionReasonQuery = typeof actionReasonQuery.inferOut;
export type UserPostsQuery = typeof userPostsQuery.inferOut;
export type UserTopmostParams = typeof userTopmostParams.inferOut;
export type UserTopmostQuery = typeof userTopmostQuery.inferOut;
export type UserFavouritesQuery = typeof userFavouritesQuery.inferOut;
export type UserVotesQuery = typeof userVotesQuery.inferOut;
export type UserBookmarksQuery = typeof userBookmarksQuery.inferOut;
export type UserFollowsQuery = typeof userFollowsQuery.inferOut;
export type UserFollowRequestsQuery = typeof userFollowRequestsQuery.inferOut;
export type UserMentionsQuery = typeof userMentionsQuery.inferOut;