"use strict";

import mongoose from "mongoose";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { actionReasonQuery, userInteractParams } from "../requestDefinitions/users.requests.ts";
import FollowRequest from "../models/follow-request.model.ts";
import Follow from "../models/follow.model.ts";
import List from "../models/list.model.ts";
import ListMember from "../models/list-member.model.ts";
import User from "../models/user.model.ts";
import Block from "../models/block.model.ts";
import * as usersController from "./users.controller.ts";

const factory = createFactory();
export const blockUser = factory.createHandlers(validator("param", userInteractParams), validator("query", actionReasonQuery), async ctx => {
	const { req } = ctx;
	const { handle: blockeeHandle } = req.valid("param");
	const { reason: blockReason } = req.valid("query");
	const { handle: blockerHandle, userId: blockerUserId } = ctx.userInfo as UserInfo;
	if (blockeeHandle === blockerHandle) {
		return ctx.text("User cannot block themselves", 422);
	}
	const session = await mongoose.startSession();
	try {
		const blockee = await usersController.findActiveUserByHandle(blockeeHandle);
		if (!blockee) {
			return ctx.text("User not found", 404);
		}
		const blocked = await session.withTransaction(async () => {
			const blockeeUserId = blockee._id;
			const blockedUser = await new Block({
				user: blockeeUserId,
				blockedBy: blockerUserId,
				reason: blockReason
			}).save({ session });
			await Promise.all([
				FollowRequest.deleteOne({
					user: blockeeUserId,
					requestedBy: blockerUserId
				}).session(session),
				FollowRequest.deleteOne({
					user: blockerUserId,
					requestedBy: blockeeUserId
				}).session(session),
				Follow.deleteOne({
					user: blockeeUserId,
					followedBy: blockerUserId
				}).session(session),
				Follow.deleteOne({
					user: blockerUserId,
					followedBy: blockeeUserId
				}).session(session),
				ListMember.deleteMany({
					list: await List.find({ owner: blockerUserId }, { _id: 1 }),
					user: blockeeUserId
				}).session(session),
				ListMember.deleteMany({
					list: await List.find({ owner: blockeeUserId }, { _id: 1 }),
					user: blockerUserId
				}).session(session),
				User.findByIdAndUpdate(blockerUserId, {
					$pull: {
						follows: blockeeUserId
					},
					$addToSet: {
						blockedUsers: blockeeUserId
					}
				}).session(session),
				List.updateMany(
					{ owner: blockerUserId },
					{
						$pull: {
							members: blockeeUserId
						}
					}
				).session(session),
				List.updateMany(
					{ owner: blockeeUserId },
					{
						$pull: {
							members: blockerUserId
						}
					}
				).session(session)
			]);
			return blockedUser;
		});
		return ctx.json({ blocked }, 200);
	} finally {
		await session.endSession();
	}
});
export const unblockUser = factory.createHandlers(validator("param", userInteractParams), async ctx => {
	const { handle: unblockeeHandle } = ctx.req.valid("param");
	const { handle: unblockerHandle, userId: unblockerUserId } = ctx.userInfo as UserInfo;
	if (unblockeeHandle === unblockerHandle) {
		return ctx.text("User cannot unblock themselves", 422);
	}
	const unblockee = await usersController.findUserByHandle(unblockeeHandle);
	if (!unblockee) {
		return ctx.text("User not found", 404);
	}
	const session = await mongoose.startSession();
	try {
		const unblocked = await session.withTransaction(async () => {
			const unblockeeUserId = unblockee._id;
			const unblockedUser = await Block.findOneAndDelete({ user: unblockeeUserId, blockedBy: unblockerUserId }).session(session);
			if (unblockedUser) {
				await User.findByIdAndUpdate(unblockerUserId, {
					$pull: {
						blockedUsers: unblockeeUserId
					}
				}).session(session);
			}
			return unblockedUser;
		});
		return ctx.json({ unblocked }, 200);
	} finally {
		await session.endSession();
	}
});