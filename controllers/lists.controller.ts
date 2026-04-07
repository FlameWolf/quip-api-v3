"use strict";

import { ObjectId } from "mongodb";
import mongoose from "mongoose";
import listPostsAggregationPipeline from "../db/pipelines/list-posts.ts";
import Follow from "../models/follow.model.ts";
import Block from "../models/block.model.ts";
import List from "../models/list.model.ts";
import ListMember from "../models/list-member.model.ts";
import * as usersController from "./users.controller.ts";
import type { ListCreateBody, ListMemberBody, ListPostsQuery, ListUpdateBody } from "../requestDefinitions/lists.requests.ts";
import type { Handler } from "hono";

export const findListPostsByNameAndOwnerId = async (listName: string, ownerId: string | ObjectId, includeRepeats = true, includeReplies = true, lastPostId?: string | ObjectId) => await List.aggregate(listPostsAggregationPipeline(listName, ownerId, includeRepeats, includeReplies, lastPostId));
export const createList: Handler = async ctx => {
	const { req } = ctx;
	const { name, includeRepeats, includeReplies } = (await req.json()) as ListCreateBody;
	const userId = (req.userInfo as UserInfo).userId;
	const list = await new List({ name, owner: userId, includeRepeats, includeReplies }).save();
	return ctx.json({ list }, 201);
};
export const updateList: Handler = async ctx => {
	const { req } = ctx;
	const { name, newName, includeRepeats, includeReplies } = (await req.json()) as ListUpdateBody;
	const userId = (req.userInfo as UserInfo).userId;
	const filter = { name, owner: userId };
	if (!(await List.countDocuments(filter))) {
		return ctx.text("List not found", 404);
	}
	if (newName && name !== newName) {
		if (await List.countDocuments({ name: newName, owner: userId })) {
			return ctx.text("You already have another list by that name", 409);
		}
	}
	const updated = await List.findOneAndUpdate(filter, { name: newName, includeRepeats, includeReplies }, { new: true });
	return ctx.json({ updated }, 200);
};
export const addMember: Handler = async ctx => {
	const { req } = ctx;
	const { name, handle } = (await req.json()) as ListMemberBody;
	const userId = (req.userInfo as UserInfo).userId;
	const list = await List.findOne({ name, owner: userId });
	if (!list) {
		return ctx.text("List not found", 404);
	}
	const member = await usersController.findActiveUserByHandle(handle);
	if (!member) {
		return ctx.text("User not found", 404);
	}
	const memberId = member._id;
	if (member.protected && !(await Follow.findOne({ user: memberId, followedBy: userId }))) {
		return ctx.text("You are not allowed to perform this action", 403);
	}
	if (await Block.countDocuments({ user: userId, blockedBy: memberId })) {
		return ctx.text("User has blocked you from adding them to lists", 403);
	}
	if (await Block.countDocuments({ user: memberId, blockedBy: userId })) {
		return ctx.text("Unblock this user to add them to lists", 403);
	}
	const session = await mongoose.startSession();
	try {
		const listId = list._id;
		const added = await session.withTransaction(async () => {
			const addedMember = await new ListMember({
				list: listId,
				user: memberId
			}).save({ session });
			await List.findByIdAndUpdate(listId, {
				$addToSet: {
					members: memberId
				}
			}).session(session);
			return addedMember;
		});
		return ctx.json({ added }, 200);
	} finally {
		await session.endSession();
	}
};
export const removeMember: Handler = async ctx => {
	const { req } = ctx;
	const { name, handle } = (await req.json()) as ListMemberBody;
	const userId = (req.userInfo as UserInfo).userId;
	const list = await List.findOne({ name, owner: userId });
	if (!list) {
		return ctx.text("List not found", 404);
	}
	const member = await usersController.findUserByHandle(handle);
	if (!member) {
		return ctx.text("User not found", 404);
	}
	const session = await mongoose.startSession();
	try {
		const listId = list._id;
		const memberId = member._id;
		const removed = await session.withTransaction(async () => {
			const removedMember = await ListMember.findOneAndDelete({
				list: listId,
				user: memberId
			}).session(session);
			await List.findByIdAndUpdate(listId, {
				$pull: {
					members: memberId
				}
			}).session(session);
			return removedMember;
		});
		return ctx.json({ removed }, 200);
	} finally {
		await session.endSession();
	}
};
export const getPosts: Handler = async ctx => {
	const { req } = ctx;
	const name = req.param("name") as string;
	const { includeRepeats, includeReplies, lastPostId } = req.query() as ListPostsQuery;
	const userId = (req.userInfo as UserInfo).userId;
	const posts = await findListPostsByNameAndOwnerId(name, userId, includeRepeats !== "false", includeReplies !== "false", lastPostId as string);
	return ctx.json({ posts }, 200);
};
export const deleteList: Handler = async ctx => {
	const { req } = ctx;
	const name = req.param("name");
	const userId = (req.userInfo as UserInfo).userId;
	const session = await mongoose.startSession();
	try {
		const deleted = await session.withTransaction(async () => {
			const deletedList = await List.findOneAndDelete({ name, owner: userId }).session(session);
			if (deletedList) {
				await ListMember.deleteMany({ list: deletedList._id }).session(session);
			}
			return deletedList;
		});
		return ctx.json({ deleted }, 200);
	} finally {
		await session.endSession();
	}
};