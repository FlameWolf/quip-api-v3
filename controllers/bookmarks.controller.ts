"use strict";

import Bookmark from "../models/bookmark.model.ts";
import * as postsController from "./posts.controller.ts";
import type { Handler } from "hono";

export const addBookmark: Handler = async ctx => {
	const { req } = ctx;
	const postId = req.param("postId") as string;
	const userId = (req.userInfo as UserInfo).userId;
	const post = await postsController.findPostById(postId);
	if (!post) {
		return ctx.text("Post not found", 404);
	}
	const bookmarked = await new Bookmark({
		post: postId,
		bookmarkedBy: userId
	});
	return ctx.json({ bookmarked }, 200);
};
export const removeBookmark: Handler = async ctx => {
	const { req } = ctx;
	const postId = req.param("postId");
	const userId = (req.userInfo as UserInfo).userId;
	const unbookmarked = await Bookmark.findOneAndDelete({
		post: postId,
		bookmarkedBy: userId
	});
	return ctx.json({ unbookmarked }, 200);
};