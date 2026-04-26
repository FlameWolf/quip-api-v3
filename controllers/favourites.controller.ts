"use strict";

import mongoose from "mongoose";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { postInteractParams } from "../requestDefinitions/posts.requests.ts";
import { favouriteScore } from "../library.ts";
import Post from "../models/post.model.ts";
import Favourite from "../models/favourite.model.ts";
import * as postsController from "./posts.controller.ts";

const factory = createFactory();
export const addFavourite = factory.createHandlers(validator("param", postInteractParams), async ctx => {
	const { postId } = ctx.req.valid("param");
	const { userId } = ctx.userInfo as UserInfo;
	const session = await mongoose.startSession();
	try {
		const post = await postsController.findPostById(postId);
		if (!post) {
			return ctx.text("Post not found", 404);
		}
		const favourited = await session.withTransaction(async () => {
			const originalPostId = post._id;
			const favouritedPost = await new Favourite({
				post: originalPostId,
				favouritedBy: userId
			}).save({ session });
			if (post.author.toString() !== userId) {
				await Post.findByIdAndUpdate(originalPostId, {
					$inc: {
						score: favouriteScore
					}
				}).session(session);
			}
			return favouritedPost;
		});
		return ctx.json({ favourited }, 200);
	} finally {
		await session.endSession();
	}
});
export const removeFavourite = factory.createHandlers(validator("param", postInteractParams), async ctx => {
	const { postId } = ctx.req.valid("param");
	const { userId } = ctx.userInfo as UserInfo;
	const session = await mongoose.startSession();
	try {
		const unfavourited = await session.withTransaction(async () => {
			const unfavouritedPost = await Favourite.findOneAndDelete({
				post: postId,
				favouritedBy: userId
			}).session(session);
			if (unfavouritedPost) {
				await Post.findOneAndUpdate(
					{
						_id: postId,
						author: {
							$ne: userId
						}
					},
					{
						$inc: {
							score: -favouriteScore
						}
					}
				).session(session);
			}
			return unfavouritedPost;
		});
		return ctx.json({ unfavourited }, 200);
	} finally {
		await session.endSession();
	}
});