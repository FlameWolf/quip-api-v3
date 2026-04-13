"use strict";

import mongoose, { type InferSchemaType, type HydratedDocument } from "mongoose";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { followRequestsBody, requestApprovalParams } from "../requestDefinitions/settings.requests.ts";
import { userInteractParams } from "../requestDefinitions/users.requests.ts";
import FollowRequest from "../models/follow-request.model.ts";
import Follow from "../models/follow.model.ts";
import * as usersController from "./users.controller.ts";

type FollowRequestModel = InferSchemaType<typeof FollowRequest.schema>;

const factory = createFactory();
export const acceptFollowRequest = factory.createHandlers(validator("param", requestApprovalParams), async ctx => {
	const { requestId: followRequestId } = ctx.req.valid("param");
	const { userId: acceptorUserId } = ctx.userInfo as UserInfo;
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
});
export const acceptSelectedFollowRequests = factory.createHandlers(validator("json", followRequestsBody), async ctx => {
	const { requestIds: followRequestIds } = ctx.req.valid("json");
	const { userId: acceptorUserId } = ctx.userInfo as UserInfo;
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
});
export const acceptAllFollowRequests = factory.createHandlers(async ctx => {
	const { userId: acceptorUserId } = ctx.userInfo as UserInfo;
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
});
export const cancelFollowRequest = factory.createHandlers(validator("param", userInteractParams), async ctx => {
	const handle = ctx.req.param("handle") as string;
	const { userId: cancellerUserId } = ctx.userInfo as UserInfo;
	const user = await usersController.findUserByHandle(handle);
	if (!user) {
		return ctx.text("User not found", 404);
	}
	const cancelled = await FollowRequest.findOneAndDelete({
		user: user._id,
		requestedBy: cancellerUserId
	});
	return ctx.json({ cancelled }, 200);
});
export const rejectFollowRequest = factory.createHandlers(validator("param", requestApprovalParams), async ctx => {
	const followRequestId = ctx.req.param("requestId");
	const { userId: rejectorUserId } = ctx.userInfo as UserInfo;
	const rejected = await FollowRequest.findOneAndDelete({
		user: rejectorUserId,
		_id: followRequestId
	});
	return ctx.json({ rejected }, 200);
});
export const rejectSelectedFollowRequests = factory.createHandlers(validator("json", followRequestsBody), async ctx => {
	const { requestIds: followRequestIds } = ctx.req.valid("json");
	const { userId: rejectorUserId } = ctx.userInfo as UserInfo;
	const result = await FollowRequest.deleteMany({
		user: rejectorUserId,
		_id: {
			$in: followRequestIds
		}
	});
	return ctx.json({ rejectedRequestsCount: result.deletedCount }, 200);
});
export const rejectAllFollowRequests = factory.createHandlers(async ctx => {
	const { userId: rejectorUserId } = ctx.userInfo as UserInfo;
	const result = await FollowRequest.deleteMany({ user: rejectorUserId });
	return ctx.json({ rejectedRequestsCount: result.deletedCount }, 200);
});