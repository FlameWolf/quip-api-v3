"use strict";

import mongoose from "mongoose";
import User from "../models/user.model.ts";
import MutedUser from "../models/muted.user.model.ts";
import MutedPost from "../models/muted.post.model.ts";
import MutedWord from "../models/muted.word.model.ts";
import * as usersController from "./users.controller.ts";
import * as postsController from "./posts.controller.ts";
import type { WordMuteBody } from "../requestDefinitions/settings.requests.ts";
import type { Handler } from "hono";

const getMutedWordRegExp = (word: string, match: string) => {
	switch (match) {
		case "startsWith":
			return `\\b${word}.*?\\b`;
		case "endsWith":
			return `\\b\\w*?${word}\\b`;
		case "exact":
			return `\\b${word}\\b`;
		default:
			return word;
	}
};
export const muteUser: Handler = async ctx => {
	const { req } = ctx;
	const muteeHandle = req.param("handle") as string;
	const muteReason = req.query("reason");
	const { handle: muterHandle, userId: muterUserId } = req.userInfo as UserInfo;
	if (muteeHandle === muterHandle) {
		return ctx.text("User cannot mute themselves", 422);
	}
	const mutee = await usersController.findActiveUserByHandle(muteeHandle);
	if (!mutee) {
		return ctx.text("User not found", 404);
	}
	const session = await mongoose.startSession();
	try {
		const muted = await session.withTransaction(async () => {
			const muteeUserId = mutee._id;
			const mutedUser = await new MutedUser({
				user: muteeUserId,
				mutedBy: muterUserId,
				reason: muteReason
			}).save({ session });
			await User.findByIdAndUpdate(muterUserId, {
				$addToSet: {
					mutedUsers: muteeUserId
				}
			}).session(session);
			return mutedUser;
		});
		return ctx.json({ muted }, 200);
	} finally {
		await session.endSession();
	}
};
export const unmuteUser: Handler = async ctx => {
	const { req } = ctx;
	const unmuteeHandle = req.param("handle") as string;
	const { handle: unmuterHandle, userId: unmuterUserId } = req.userInfo as UserInfo;
	if (unmuteeHandle === unmuterHandle) {
		return ctx.text("User cannot unmute themselves", 422);
	}
	const unmutee = await usersController.findUserByHandle(unmuteeHandle);
	if (!unmutee) {
		return ctx.text("User not found", 404);
	}
	const session = await mongoose.startSession();
	try {
		const unmuted = await session.withTransaction(async () => {
			const unmuteeUserId = unmutee._id;
			const unmutedUser = await MutedUser.findOneAndDelete({ user: unmuteeUserId, mutedBy: unmuterUserId }).session(session);
			if (unmutedUser) {
				await User.findByIdAndUpdate(unmuterUserId, {
					$pull: {
						mutedUsers: unmuteeUserId
					}
				}).session(session);
			}
			return unmutedUser;
		});
		return ctx.json({ unmuted }, 200);
	} finally {
		await session.endSession();
	}
};
export const mutePost: Handler = async ctx => {
	const { req } = ctx;
	const postId = req.param("postId") as string;
	const userId = (req.userInfo as UserInfo).userId;
	const post = await postsController.findPostById(postId);
	if (!post) {
		return ctx.text("Post not found", 404);
	}
	const session = await mongoose.startSession();
	try {
		const muted = await session.withTransaction(async () => {
			const mutedPost = await new MutedPost({ post: postId, mutedBy: userId }).save({ session });
			await User.findByIdAndUpdate(userId, {
				$addToSet: {
					mutedPosts: postId
				}
			}).session(session);
			return mutedPost;
		});
		return ctx.json({ muted }, 200);
	} finally {
		await session.endSession();
	}
};
export const unmutePost: Handler = async ctx => {
	const { req } = ctx;
	const postId = req.param("postId");
	const userId = (req.userInfo as UserInfo).userId;
	const session = await mongoose.startSession();
	try {
		const unmuted = await session.withTransaction(async () => {
			const unmutedPost = await MutedPost.findOneAndDelete({ post: postId, mutedBy: userId }).session(session);
			if (unmutedPost) {
				await User.findByIdAndUpdate(userId, {
					$pull: {
						mutedPosts: postId
					}
				}).session(session);
			}
			return unmutedPost;
		});
		return ctx.json({ unmuted }, 200);
	} finally {
		await session.endSession();
	}
};
export const muteWord: Handler = async ctx => {
	const { req } = ctx;
	const { word, match } = (await req.json()) as WordMuteBody;
	const userId = (req.userInfo as UserInfo).userId;
	const session = await mongoose.startSession();
	try {
		const muted = await session.withTransaction(async () => {
			const mutedWord = await new MutedWord({ word, match, mutedBy: userId }).save({ session });
			await User.findByIdAndUpdate(userId, {
				$addToSet: {
					mutedWords: getMutedWordRegExp(word, match as string)
				}
			}).session(session);
			return mutedWord;
		});
		return ctx.json({ muted }, 200);
	} finally {
		await session.endSession();
	}
};
export const unmuteWord: Handler = async ctx => {
	const { req } = ctx;
	const { word, match } = (await req.json()) as WordMuteBody;
	const userId = (req.userInfo as UserInfo).userId;
	const session = await mongoose.startSession();
	try {
		const unmuted = await session.withTransaction(async () => {
			const unmutedWord = await MutedWord.findOneAndDelete({ word, match, mutedBy: userId }).session(session);
			if (unmutedWord) {
				await User.findByIdAndUpdate(userId, {
					$pull: {
						mutedWords: getMutedWordRegExp(word, match as string)
					}
				}).session(session);
			}
			return unmutedWord;
		});
		return ctx.json({ unmuted }, 200);
	} finally {
		await session.endSession();
	}
};