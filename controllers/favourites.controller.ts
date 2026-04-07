"use strict";

import mongoose from "mongoose";
import { favouriteScore } from "../library.ts";
import Post from "../models/post.model.ts";
import Favourite from "../models/favourite.model.ts";
import * as postsController from "./posts.controller.ts";
import type { Handler } from "hono";

export const addFavourite: Handler = async ctx => {
	const { req } = ctx;
	const postId = req.param("postId") as string;
	const userId = (req.userInfo as UserInfo).userId;
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
			await Post.findByIdAndUpdate(originalPostId, {
				$inc: {
					score: favouriteScore
				}
			}).session(session);
			return favouritedPost;
		});
		return ctx.json({ favourited }, 200);
	} finally {
		await session.endSession();
	}
};
export const removeFavourite: Handler = async ctx => {
	const { req } = ctx;
	const postId = req.param("postId");
	const userId = (req.userInfo as UserInfo).userId;
	const session = await mongoose.startSession();
	try {
		const unfavourited = await session.withTransaction(async () => {
			const unfavouritedPost = await Favourite.findOneAndDelete({
				post: postId,
				favouritedBy: userId
			}).session(session);
			if (unfavouritedPost) {
				await Post.findByIdAndUpdate(postId, {
					$inc: {
						score: -favouriteScore
					}
				}).session(session);
			}
			return unfavouritedPost;
		});
		return ctx.json({ unfavourited }, 200);
	} finally {
		await session.endSession();
	}
};