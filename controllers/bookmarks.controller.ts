"use strict";

import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { postInteractParams } from "../requestDefinitions/posts.requests.ts";
import Bookmark from "../models/bookmark.model.ts";
import * as postsController from "./posts.controller.ts";

const factory = createFactory();
export const addBookmark = factory.createHandlers(validator("param", postInteractParams), async ctx => {
	const { postId } = ctx.req.valid("param");
	const { userId } = ctx.userInfo as UserInfo;
	const post = await postsController.findPostById(postId);
	if (!post) {
		return ctx.text("Post not found", 404);
	}
	const bookmarked = await new Bookmark({
		post: postId,
		bookmarkedBy: userId
	});
	return ctx.json({ bookmarked }, 200);
});
export const removeBookmark = factory.createHandlers(validator("param", postInteractParams), async ctx => {
	const { postId } = ctx.req.valid("param");
	const { userId } = ctx.userInfo as UserInfo;
	const unbookmarked = await Bookmark.findOneAndDelete({
		post: postId,
		bookmarkedBy: userId
	});
	return ctx.json({ unbookmarked }, 200);
});