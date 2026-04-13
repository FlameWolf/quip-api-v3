"use strict";

import mongoose from "mongoose";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { userInteractParams } from "../requestDefinitions/users.requests.ts";
import Block from "../models/block.model.ts";
import User from "../models/user.model.ts";
import FollowRequest from "../models/follow-request.model.ts";
import Follow from "../models/follow.model.ts";
import * as usersController from "./users.controller.ts";

const factory = createFactory();
export const followUser = factory.createHandlers(validator("param", userInteractParams), async ctx => {
	const { handle: followeeHandle } = ctx.req.valid("param");
	const { handle: followerHandle, userId: followerUserId } = ctx.userInfo as UserInfo;
	if (followeeHandle === followerHandle) {
		return ctx.text("User cannot follow themselves", 422);
	}
	const followee = await usersController.findActiveUserByHandle(followeeHandle);
	if (!followee) {
		return ctx.text("User not found", 404);
	}
	const followeeUserId = followee._id;
	if (await Block.countDocuments({ user: followerUserId, blockedBy: followeeUserId })) {
		return ctx.text("User has blocked you from following them", 403);
	}
	if (await Block.countDocuments({ user: followeeUserId, blockedBy: followerUserId })) {
		return ctx.text("Unblock this user before trying to follow them", 403);
	}
	if (followee.protected) {
		const requested = await new FollowRequest({
			user: followeeUserId,
			requestedBy: followerUserId
		}).save();
		return ctx.json({ requested }, 200);
	}
	const session = await mongoose.startSession();
	try {
		const followed = await session.withTransaction(async () => {
			const followedUser = await new Follow({
				user: followeeUserId,
				followedBy: followerUserId
			}).save({ session });
			await User.findByIdAndUpdate(followerUserId, {
				$addToSet: {
					follows: followeeUserId
				}
			}).session(session);
			return followedUser;
		});
		return ctx.json({ followed }, 200);
	} finally {
		await session.endSession();
	}
});
export const unfollowUser = factory.createHandlers(validator("param", userInteractParams), async ctx => {
	const { handle: unfolloweeHandle } = ctx.req.valid("param");
	const { handle: unfollowerHandle, userId: unfollowerUserId } = ctx.userInfo as UserInfo;
	if (unfolloweeHandle === unfollowerHandle) {
		return ctx.text("User cannot unfollow themselves", 422);
	}
	const unfollowee = await usersController.findUserByHandle(unfolloweeHandle);
	if (!unfollowee) {
		return ctx.text("User not found", 404);
	}
	const session = await mongoose.startSession();
	try {
		const unfollowed = await session.withTransaction(async () => {
			const unfolloweeUserId = unfollowee._id;
			const unfollowedUser = await Follow.findOneAndDelete({ user: unfolloweeUserId, followedBy: unfollowerUserId }).session(session);
			if (unfollowedUser) {
				await User.findByIdAndUpdate(unfollowerUserId, {
					$pull: {
						follows: unfolloweeUserId
					}
				}).session(session);
			}
			return unfollowedUser;
		});
		return ctx.json({ unfollowed }, 200);
	} finally {
		await session.endSession();
	}
});