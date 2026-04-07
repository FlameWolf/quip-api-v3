"use strict";

import searchPostsAggregationPipeline from "../db/pipelines/search-posts.ts";
import nearbyPostsAggregationPipeline from "../db/pipelines/nearby-posts.ts";
import searchUsersAggregationPipeline from "../db/pipelines/search-users.ts";
import Post from "../models/post.model.ts";
import User from "../models/user.model.ts";
import type { SearchNearbyQuery, SearchQuery, SearchUsersQuery } from "../requestDefinitions/search.requests.ts";
import type { Handler } from "hono";

export const searchPosts: Handler = async ctx => {
	const { req } = ctx;
	const { q: searchText, from, since, until, "has-media": hasMedia, "not-from": notFrom, "sort-by": sortBy, "date-order": dateOrder, replies, langs: languages, "langs-match": includeLanguages, "media-desc": mediaDescription, lastScore, lastPostId } = req.query() as SearchQuery;
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
			(req.userInfo as UserInfo)?.userId,
			lastScore,
			lastPostId
		)
	);
	return ctx.json({ posts }, 200);
};
export const nearbyPosts: Handler = async ctx => {
	const { req } = ctx;
	const { long: longitude, lat: latitude, "max-dist": maxDistance, lastDistance, lastPostId } = req.query() as SearchNearbyQuery & Dictionary;
	const posts = await Post.aggregate(nearbyPostsAggregationPipeline([longitude, latitude], maxDistance, (req.userInfo as UserInfo)?.userId, lastDistance, lastPostId));
	return ctx.json({ posts }, 200);
};
export const searchUsers: Handler = async ctx => {
	const { req } = ctx;
	const { q: searchText, match, "date-order": dateOrder, lastUserId } = req.query() as SearchUsersQuery;
	if (!searchText) {
		return ctx.text("Search text missing", 400);
	}
	const users = await User.aggregate(searchUsersAggregationPipeline(searchText, match, dateOrder, (req.userInfo as UserInfo)?.userId, lastUserId));
	return ctx.json({ users }, 200);
};