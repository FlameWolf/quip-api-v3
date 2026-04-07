"use strict";

import mongoose, { type InferSchemaType, type HydratedDocument } from "mongoose";
import FollowRequest from "../models/follow-request.model.ts";
import Follow from "../models/follow.model.ts";
import * as usersController from "./users.controller.ts";
import type { FollowRequestsBody } from "../requestDefinitions/settings.requests.ts";
import type { Handler } from "hono";

type FollowRequestModel = InferSchemaType<typeof FollowRequest.schema>;

export const acceptFollowRequest: Handler = async ctx => {
	const { req } = ctx;
	const followRequestId = req.param("requestId") as string;
	const acceptorUserId = (req.userInfo as UserInfo).userId;
	const session = await mongoose.startSession();
	try {
		const followRequest = (await FollowRequest.findOne(
			{
				user: acceptorUserId,
				_id: followRequestId
			},
			{
				requestedBy: 1
			}
		)) as FollowRequestModel;
		if (!followRequest) {
			return ctx.json(new Error("Follow request not found"), 404);
		}
		const accepted = await session.withTransaction(async () => {
			await FollowRequest.deleteOne(followRequest).session(session);
			const acceptedRequest = await new Follow({
				user: acceptorUserId,
				followedBy: followRequest.requestedBy
			}).save({ session });
			return acceptedRequest;
		});
		return ctx.json({ accepted }, 200);
	} finally {
		await session.endSession();
	}
};
export const acceptSelectedFollowRequests: Handler = async ctx => {
	const { req } = ctx;
	const followRequestIds = ((await req.json()) as FollowRequestsBody).requestIds;
	const acceptorUserId = (req.userInfo as UserInfo).userId;
	const session = await mongoose.startSession();
	try {
		const acceptedRequestsCount = await session.withTransaction(async () => {
			const filter = {
				user: acceptorUserId,
				_id: {
					$in: followRequestIds
				}
			};
			await FollowRequest.deleteMany(filter).session(session);
			const result = await Follow.bulkSave(
				(
					await FollowRequest.find(filter, {
						_id: 0,
						user: acceptorUserId,
						followedBy: "$requestedBy"
					})
				).map(followRequest => new Follow(followRequest)),
				{ session }
			);
			return result.insertedCount;
		});
		return ctx.json({ acceptedRequestsCount }, 200);
	} finally {
		await session.endSession();
	}
};
export const acceptAllFollowRequests: Handler = async ctx => {
	const acceptorUserId = (ctx.req.userInfo as UserInfo).userId;
	const session = await mongoose.startSession();
	try {
		const batchSize = 65536;
		const acceptedRequestsCount = await session.withTransaction(async () => {
			let batchCount = 0;
			let totalCount = 0;
			const filter = { user: acceptorUserId };
			do {
				const followRequests = await FollowRequest.find(filter, { user: acceptorUserId, followedBy: "$requestedBy" }).limit(batchSize).session(session);
				await FollowRequest.deleteMany({
					_id: {
						$in: followRequests.map(followRequest => followRequest._id)
					}
				}).session(session);
				const result = await Follow.bulkSave(
					followRequests.map((followRequest: Partial<HydratedDocument<FollowRequestModel>>) => {
						delete followRequest._id;
						return new Follow(followRequest);
					}),
					{ session }
				);
				batchCount = result.insertedCount;
				totalCount += batchCount;
			} while (batchCount === batchSize);
			return totalCount;
		});
		return ctx.json({ acceptedRequestsCount }, 200);
	} finally {
		await session.endSession();
	}
};
export const cancelFollowRequest: Handler = async ctx => {
	const { req } = ctx;
	const handle = req.param("handle") as string;
	const cancellerUserId = (req.userInfo as UserInfo).userId;
	const user = await usersController.findUserByHandle(handle);
	if (!user) {
		return ctx.text("User not found", 404);
	}
	const cancelled = await FollowRequest.findOneAndDelete({
		user: user._id,
		requestedBy: cancellerUserId
	});
	return ctx.json({ cancelled }, 200);
};
export const rejectFollowRequest: Handler = async ctx => {
	const { req } = ctx;
	const followRequestId = req.param("requestId");
	const rejectorUserId = (req.userInfo as UserInfo).userId;
	const rejected = await FollowRequest.findOneAndDelete({
		user: rejectorUserId,
		_id: followRequestId
	});
	return ctx.json({ rejected }, 200);
};
export const rejectSelectedFollowRequests: Handler = async ctx => {
	const { req } = ctx;
	const followRequestIds = ((await req.json()) as FollowRequestsBody).requestIds;
	const rejectorUserId = (req.userInfo as UserInfo).userId;
	const result = await FollowRequest.deleteMany({
		user: rejectorUserId,
		_id: {
			$in: followRequestIds
		}
	});
	return ctx.json({ rejectedRequestsCount: result.deletedCount }, 200);
};
export const rejectAllFollowRequests: Handler = async ctx => {
	const rejectorUserId = (ctx.req.userInfo as UserInfo).userId;
	const result = await FollowRequest.deleteMany({ user: rejectorUserId });
	return ctx.json({ rejectedRequestsCount: result.deletedCount }, 200);
};