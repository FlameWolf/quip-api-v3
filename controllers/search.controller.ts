"use strict";

import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { searchNearbyQuery, searchQuery, searchUsersQuery } from "../requestDefinitions/search.requests.ts";
import searchPostsAggregationPipeline from "../db/pipelines/search-posts.ts";
import nearbyPostsAggregationPipeline from "../db/pipelines/nearby-posts.ts";
import searchUsersAggregationPipeline from "../db/pipelines/search-users.ts";
import Post from "../models/post.model.ts";
import User from "../models/user.model.ts";

const factory = createFactory();
export const searchPosts = factory.createHandlers(validator("query", searchQuery), async ctx => {
	const { q: searchText, from, since, until, "has-media": hasMedia, "not-from": notFrom, "sort-by": sortBy, "date-order": dateOrder, replies, langs: languages, "langs-match": includeLanguages, "media-desc": mediaDescription, lastScore, lastPostId } = ctx.req.valid("query");
	const posts = await Post.aggregate(
		searchPostsAggregationPipeline(
			searchText?.trim(),
			{
				from,
				since,
				until,
				hasMedia,
				notFrom,
				replies,
				languages,
				includeLanguages,
				mediaDescription
			},
			sortBy,
			dateOrder,
			(ctx.userInfo as UserInfo)?.userId,
			lastScore,
			lastPostId
		)
	);
	return ctx.json({ posts }, 200);
});
export const nearbyPosts = factory.createHandlers(validator("query", searchNearbyQuery), async ctx => {
	const { long: longitude, lat: latitude, "max-dist": maxDistance, lastDistance, lastPostId } = ctx.req.valid("query");
	const posts = await Post.aggregate(nearbyPostsAggregationPipeline([longitude, latitude], maxDistance, (ctx.userInfo as UserInfo)?.userId, lastDistance, lastPostId));
	return ctx.json({ posts }, 200);
});
export const searchUsers = factory.createHandlers(validator("query", searchUsersQuery), async ctx => {
	const { q: searchText, match, "date-order": dateOrder, lastUserId } = ctx.req.valid("query");
	if (!searchText) {
		return ctx.text("Search text missing", 400);
	}
	const users = await User.aggregate(searchUsersAggregationPipeline(searchText, match, dateOrder, (ctx.userInfo as UserInfo)?.userId, lastUserId));
	return ctx.json({ users }, 200);
});