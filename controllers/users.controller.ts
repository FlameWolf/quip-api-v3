"use strict";

import { ObjectId } from "mongodb";
import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";
import bcrypt from "bcrypt";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { userBookmarksQuery, userFavouritesQuery, userFollowRequestsQuery, userFollowsQuery, userInteractParams, userMentionsQuery, userPostsQuery, userTopmostParams, userTopmostQuery, userVotesQuery } from "../requestDefinitions/users.requests.ts";
import { listMembersQuery, listsQuery } from "../requestDefinitions/lists.requests.ts";
import { blockedUsersQuery, changePasswordBody, mutedItemsQuery, updateEmailBody } from "../requestDefinitions/settings.requests.ts";
import { postInteractParams } from "../requestDefinitions/posts.requests.ts";
import { noReplyEmail, passwordRegExp, rounds, emailTemplates } from "../library.ts";
import userAggregationPipeline from "../db/pipelines/user.ts";
import userPostsAggregationPipeline from "../db/pipelines/user-posts.ts";
import topmostAggregationPipeline from "../db/pipelines/topmost.ts";
import favouritesAggregationPipeline from "../db/pipelines/favourites.ts";
import votesAggregationPipeline from "../db/pipelines/votes.ts";
import bookmarksAggregationPipeline from "../db/pipelines/bookmarks.ts";
import followingAggregationPipeline from "../db/pipelines/following.ts";
import followersAggregationPipeline from "../db/pipelines/followers.ts";
import followRequestsSentAggregationPipeline from "../db/pipelines/follow-requests-sent.ts";
import followRequestsReceivedAggregationPipeline from "../db/pipelines/follow-requests-received.ts";
import mentionsAggregationPipeline from "../db/pipelines/mentions.ts";
import listsAggregationPipeline from "../db/pipelines/lists.ts";
import listMembersAggregationPipeline from "../db/pipelines/list-members.ts";
import blocksAggregationPipeline from "../db/pipelines/blocks.ts";
import mutedUsersAggregationPipeline from "../db/pipelines/muted-users.ts";
import mutedPostsAggregationPipeline from "../db/pipelines/muted-posts.ts";
import mutedWordsAggregationPipeline from "../db/pipelines/muted-words.ts";
import User from "../models/user.model.ts";
import Post from "../models/post.model.ts";
import Favourite from "../models/favourite.model.ts";
import Vote from "../models/vote.model.ts";
import Bookmark from "../models/bookmark.model.ts";
import Follow from "../models/follow.model.ts";
import FollowRequest from "../models/follow-request.model.ts";
import List from "../models/list.model.ts";
import ListMember from "../models/list-member.model.ts";
import Block from "../models/block.model.ts";
import MutedUser from "../models/muted.user.model.ts";
import MutedPost from "../models/muted.post.model.ts";
import MutedWord from "../models/muted.word.model.ts";
import EmailVerification from "../models/email-verification.model.ts";
import RefreshToken from "../models/refresh-token.model.ts";
import PasswordReset from "../models/password-reset.model.ts";
import Settings from "../models/settings.model.ts";
import * as emailController from "./email.controller.ts";
import * as postsController from "./posts.controller.ts";

type UserModel = InferSchemaType<typeof User.schema>;

const factory = createFactory();
export const findActiveUserByHandle = async (handle: string) => (await User.findOne({ handle, deactivated: false, deleted: false })) as HydratedDocument<UserModel>;
export const findUserById = async (userId: string | ObjectId) => (await User.findOne({ _id: userId, deleted: false })) as HydratedDocument<UserModel>;
export const findUserByHandle = async (handle: string) => (await User.findOne({ handle, deleted: false })) as HydratedDocument<UserModel>;
export const findPostsByUserId = async (userId: ObjectId, includeRepeats?: boolean, includeReplies?: boolean, visitorId?: string | ObjectId, lastPostId?: string | ObjectId) => await User.aggregate(userPostsAggregationPipeline(userId, includeRepeats, includeReplies, visitorId, lastPostId));
export const findFavouritesByUserId = async (userId: string | ObjectId, lastFavouriteId?: string | ObjectId) => await User.aggregate(favouritesAggregationPipeline(userId, lastFavouriteId));
export const findVotesByUserId = async (userId: string | ObjectId, lastVoteId?: string | ObjectId) => await User.aggregate(votesAggregationPipeline(userId, lastVoteId));
export const findBookmarksByUserId = async (userId: string | ObjectId, lastBookmarkId?: string | ObjectId) => await User.aggregate(bookmarksAggregationPipeline(userId, lastBookmarkId));
export const findFollowingByUserId = async (userId: string | ObjectId, lastFollowId?: string | ObjectId) => await Follow.aggregate(followingAggregationPipeline(userId, lastFollowId));
export const findFollowersByUserId = async (userId: string | ObjectId, lastFollowId?: string | ObjectId) => await Follow.aggregate(followersAggregationPipeline(userId, lastFollowId));
export const findFollowRequestsSentByUserId = async (userId: string | ObjectId, lastFollowRequestId?: string | ObjectId) => await Follow.aggregate(followRequestsSentAggregationPipeline(userId, lastFollowRequestId));
export const findFollowRequestsReceivedByUserId = async (userId: string | ObjectId, lastFollowRequestId?: string | ObjectId) => await Follow.aggregate(followRequestsReceivedAggregationPipeline(userId, lastFollowRequestId));
export const findMentionsByUserId = async (userId: ObjectId, selfId?: string | ObjectId, lastMentionId?: string | ObjectId) => await Post.aggregate(mentionsAggregationPipeline(userId, selfId, lastMentionId));
export const findListsByUserId = async (userId: string | ObjectId, memberId?: string | ObjectId, lastListId?: string | ObjectId) => await List.aggregate(listsAggregationPipeline(userId, memberId, lastListId));
export const findMembersByListId = async (listId: ObjectId, lastMemberId?: string | ObjectId) => await ListMember.aggregate(listMembersAggregationPipeline(listId, lastMemberId));
export const findBlocksByUserId = async (userId: string | ObjectId, lastBlockId?: string | ObjectId) => await Block.aggregate(blocksAggregationPipeline(userId, lastBlockId));
export const findMutedUsersByUserId = async (userId: string | ObjectId, lastMuteId?: string | ObjectId) => await MutedUser.aggregate(mutedUsersAggregationPipeline(userId, lastMuteId));
export const findMutedPostsByUserId = async (userId: string | ObjectId, lastMuteId?: string | ObjectId) => await MutedPost.aggregate(mutedPostsAggregationPipeline(userId, lastMuteId));
export const findMutedWordsByUserId = async (userId: string | ObjectId, lastMuteId?: string | ObjectId) => (await MutedWord.aggregate(mutedWordsAggregationPipeline(userId, lastMuteId))) as Array<{ word: string; match: string }>;
export const getUser = factory.createHandlers(validator("param", userInteractParams), async ctx => {
	const { handle } = ctx.req.valid("param");
	const user = (
		await User.aggregate([
			{
				$match: {
					handle,
					deactivated: false,
					deleted: false
				}
			},
			...userAggregationPipeline(ctx.userInfo?.userId)
		])
	).shift();
	if (!user) {
		return ctx.text("User not found", 404);
	}
	return ctx.json({ user }, 200);
});
export const getUserPosts = factory.createHandlers(validator("param", userInteractParams), validator("query", userPostsQuery), async ctx => {
	const { req } = ctx;
	const { handle } = req.valid("param");
	const { includeRepeats, includeReplies, lastPostId } = req.valid("query");
	const user = await findActiveUserByHandle(handle);
	if (!user) {
		return ctx.text("User not found", 404);
	}
	const posts = await findPostsByUserId(user._id, includeRepeats === "true", includeReplies === "true", ctx.userInfo?.userId, lastPostId);
	return ctx.json({ posts }, 200);
});
export const getUserTopmost = factory.createHandlers(validator("param", userTopmostParams), validator("query", userTopmostQuery), async ctx => {
	const { req } = ctx;
	const { handle, period } = req.valid("param");
	const { lastScore, lastPostId } = req.valid("query");
	const filter = { handle };
	if (!(await User.countDocuments(filter))) {
		return ctx.text("User not found", 404);
	}
	const posts = await User.aggregate([
		{
			$match: filter
		},
		{
			$lookup: {
				from: "posts",
				localField: "_id",
				foreignField: "author",
				pipeline: topmostAggregationPipeline(ctx.userInfo?.userId, period, lastScore, lastPostId) as Array<any>,
				as: "posts"
			}
		},
		{
			$unwind: "$posts"
		},
		{
			$replaceRoot: {
				newRoot: "$posts"
			}
		}
	]);
	return ctx.json({ posts }, 200);
});
export const getUserFavourites = factory.createHandlers(validator("param", userInteractParams), validator("query", userFavouritesQuery), async ctx => {
	const { req } = ctx;
	const { handle } = req.valid("param");
	const { lastFavouriteId } = req.valid("query");
	const userInfo = ctx.userInfo as UserInfo;
	if (userInfo.handle !== handle) {
		return ctx.status(401);
	}
	const favourites = await findFavouritesByUserId(userInfo.userId, lastFavouriteId as string);
	return ctx.json({ favourites }, 200);
});
export const getUserVotes = factory.createHandlers(validator("param", userInteractParams), validator("query", userVotesQuery), async ctx => {
	const { req } = ctx;
	const { handle } = req.valid("param");
	const { lastVoteId } = req.valid("query");
	const userInfo = ctx.userInfo as UserInfo;
	if (userInfo.handle !== handle) {
		return ctx.status(401);
	}
	const votes = await findVotesByUserId(userInfo.userId, lastVoteId as string);
	return ctx.json({ votes }, 200);
});
export const getUserBookmarks = factory.createHandlers(validator("param", userInteractParams), validator("query", userBookmarksQuery), async ctx => {
	const { req } = ctx;
	const { handle } = req.valid("param");
	const { lastBookmarkId } = req.valid("query");
	const userInfo = ctx.userInfo as UserInfo;
	if (userInfo.handle !== handle) {
		return ctx.status(401);
	}
	const bookmarks = await findBookmarksByUserId(userInfo.userId, lastBookmarkId as string);
	return ctx.json({ bookmarks }, 200);
});
export const getUserFollowing = factory.createHandlers(validator("param", userInteractParams), validator("query", userFollowsQuery), async ctx => {
	const { req } = ctx;
	const { handle } = req.valid("param");
	const { lastFollowId } = req.valid("query");
	const userInfo = ctx.userInfo as UserInfo;
	if (userInfo.handle !== handle) {
		return ctx.status(401);
	}
	const following = await findFollowingByUserId(userInfo.userId, lastFollowId as string);
	return ctx.json({ following }, 200);
});
export const getUserFollowers = factory.createHandlers(validator("param", userInteractParams), validator("query", userFollowsQuery), async ctx => {
	const { req } = ctx;
	const { handle } = req.valid("param");
	const { lastFollowId } = req.valid("query");
	const userInfo = ctx.userInfo as UserInfo;
	if (userInfo.handle !== handle) {
		return ctx.status(401);
	}
	const followers = await findFollowersByUserId(userInfo.userId, lastFollowId as string);
	return ctx.json({ followers }, 200);
});
export const getUserFollowRequestsSent = factory.createHandlers(validator("param", userInteractParams), validator("query", userFollowRequestsQuery), async ctx => {
	const { req } = ctx;
	const { handle } = req.valid("param");
	const { lastFollowRequestId } = req.valid("query");
	const userInfo = ctx.userInfo as UserInfo;
	if (userInfo.handle !== handle) {
		return ctx.status(401);
	}
	const followRequests = await findFollowRequestsSentByUserId(userInfo.userId, lastFollowRequestId as string);
	return ctx.json({ followRequests }, 200);
});
export const getUserFollowRequestsReceived = factory.createHandlers(validator("param", userInteractParams), validator("query", userFollowRequestsQuery), async ctx => {
	const { req } = ctx;
	const { handle } = req.valid("param");
	const { lastFollowRequestId } = req.valid("query");
	const userInfo = ctx.userInfo as UserInfo;
	if (userInfo.handle !== handle) {
		return ctx.status(401);
	}
	const followRequests = await findFollowRequestsReceivedByUserId(userInfo.userId, lastFollowRequestId as string);
	return ctx.json({ followRequests }, 200);
});
export const getUserMentions = factory.createHandlers(validator("param", userInteractParams), validator("query", userMentionsQuery), async ctx => {
	const { req } = ctx;
	const { handle } = req.valid("param");
	const { lastMentionId } = req.valid("query");
	const user = await findActiveUserByHandle(handle);
	if (!user) {
		return ctx.text("User not found", 404);
	}
	const mentions = await findMentionsByUserId(user._id, ctx.userInfo?.userId, lastMentionId as string);
	return ctx.json({ mentions }, 200);
});
export const getLists = factory.createHandlers(validator("query", listsQuery), async ctx => {
	const { memberHandle, lastListId } = ctx.req.valid("query");
	const { userId } = ctx.userInfo as UserInfo;
	const member = await findUserByHandle(memberHandle);
	if (memberHandle && !member) {
		return ctx.text("User not found", 404);
	}
	const lists = await findListsByUserId(userId, member?._id, lastListId);
	return ctx.json({ lists }, 200);
});
export const getListMembers = factory.createHandlers(validator("query", listMembersQuery), async ctx => {
	const { req } = ctx;
	const name = req.param("name");
	const { lastMemberId } = req.valid("query");
	const { userId } = ctx.userInfo as UserInfo;
	const list = await List.findOne({ name, owner: userId });
	if (!list) {
		return ctx.text("List not found", 404);
	}
	const members = await findMembersByListId(list._id, lastMemberId as string);
	return ctx.json({ members }, 200);
});
export const getBlocks = factory.createHandlers(validator("query", blockedUsersQuery), async ctx => {
	const { lastBlockId } = ctx.req.valid("query");
	const { userId } = ctx.userInfo as UserInfo;
	const blockedUsers = await findBlocksByUserId(userId, lastBlockId as string);
	return ctx.json({ blockedUsers }, 200);
});
export const getMutedUsers = factory.createHandlers(validator("query", mutedItemsQuery), async ctx => {
	const { lastMuteId } = ctx.req.valid("query");
	const { userId } = ctx.userInfo as UserInfo;
	const mutedUsers = await findMutedUsersByUserId(userId, lastMuteId as string);
	return ctx.json({ mutedUsers }, 200);
});
export const getMutedPosts = factory.createHandlers(validator("query", mutedItemsQuery), async ctx => {
	const { lastMuteId } = ctx.req.valid("query");
	const { userId } = ctx.userInfo as UserInfo;
	const mutedPosts = await findMutedPostsByUserId(userId, lastMuteId as string);
	return ctx.json({ mutedPosts }, 200);
});
export const getMutedWords = factory.createHandlers(validator("query", mutedItemsQuery), async ctx => {
	const { lastMuteId } = ctx.req.valid("query");
	const { userId } = ctx.userInfo as UserInfo;
	const mutedWords = await findMutedWordsByUserId(userId, lastMuteId as string);
	for (const mute of mutedWords) {
		mute.word = mute.word.replace(/\\(.)/g, "$1");
	}
	return ctx.json({ mutedWords }, 200);
});
export const pinPost = factory.createHandlers(validator("param", postInteractParams), async ctx => {
	const { postId } = ctx.req.valid("param");
	const { userId } = ctx.userInfo as UserInfo;
	const post = await postsController.findPostById(postId);
	if (!post) {
		return ctx.text("Post not found", 404);
	}
	if (post.author.toString() !== userId) {
		return ctx.text("User can pin only their own post", 403);
	}
	const pinned = await User.findByIdAndUpdate(userId, { pinnedPost: post._id }, { new: true });
	return ctx.json({ pinned }, 200);
});
export const unpinPost = factory.createHandlers(async ctx => {
	const { userId } = ctx.userInfo as UserInfo;
	const unpinned = await User.findByIdAndUpdate(userId, { pinnedPost: undefined }, { new: true });
	return ctx.json({ unpinned }, 200);
});
export const updateEmail = factory.createHandlers(validator("json", updateEmailBody), async ctx => {
	const { email: newEmail } = ctx.req.valid("json");
	const { handle, userId } = ctx.userInfo as UserInfo;
	const { email: currentEmail } = (await User.findById(userId, { email: 1 })) as HydratedDocument<UserModel>;
	const emailVerification = await new EmailVerification({
		user: userId,
		email: newEmail,
		previousEmail: currentEmail,
		token: new ObjectId()
	}).save();
	if (currentEmail) {
		await emailController.sendEmail(noReplyEmail, currentEmail, "Email address changed", emailTemplates.actions.rejectEmail(handle, currentEmail, `${process.env.ALLOW_ORIGIN}/reject-email/${emailVerification.token}`));
	}
	await emailController.sendEmail(noReplyEmail, newEmail, "Verify email address", emailTemplates.actions.verifyEmail(handle, newEmail, `${process.env.ALLOW_ORIGIN}/verify-email/${emailVerification.token}`));
	return ctx.json({ emailVerification }, 200);
});
export const changePassword = factory.createHandlers(validator("json", changePasswordBody), async ctx => {
	const { userId } = ctx.userInfo as UserInfo;
	const { oldPassword, newPassword } = ctx.req.valid("json");
	const user = (await User.findById(userId).select("+password +email")) as HydratedDocument<UserModel>;
	const email = user.email;
	const authStatus = bcrypt.compareSync(oldPassword, user.password);
	if (!authStatus) {
		return ctx.text("Current password is incorrect", 403);
	}
	if (!(newPassword && passwordRegExp.test(newPassword))) {
		return ctx.text("New password is invalid", 400);
	}
	const passwordHash = bcrypt.hashSync(newPassword, rounds);
	await User.findByIdAndUpdate(user._id, { password: passwordHash });
	if (email) {
		await emailController.sendEmail(noReplyEmail, email, "Password changed", emailTemplates.notifications.passwordChanged(user.handle));
	}
	return ctx.status(200);
});
export const deactivateUser = factory.createHandlers(async ctx => {
	const { userId } = ctx.userInfo as UserInfo;
	const session = await mongoose.startSession();
	try {
		const { deactivated, email } = await session.withTransaction(async () => {
			const deactivated = (await User.findByIdAndUpdate(userId, { deactivated: true }, { new: true }).select("+email").session(session)) as HydratedDocument<UserModel>;
			const email = deactivated.email;
			await RefreshToken.deleteMany({ user: userId }).session(session);
			return { deactivated, email };
		});
		if (email) {
			await emailController.sendEmail(noReplyEmail, email, "Account deactivated", emailTemplates.notifications.deactivated(deactivated.handle));
		}
		return ctx.json({ deactivated }, 200);
	} finally {
		await session.endSession();
	}
});
export const activateUser = factory.createHandlers(async ctx => {
	const { userId } = ctx.userInfo as UserInfo;
	const activated = (await User.findByIdAndUpdate(
		userId,
		{
			deactivated: false
		},
		{
			new: true
		}
	).select("+email")) as HydratedDocument<UserModel>;
	const email = activated.email;
	if (email) {
		await emailController.sendEmail(noReplyEmail, email, "Account activated", emailTemplates.notifications.activated(activated.handle));
	}
	return ctx.json({ activated }, 200);
});
export const deleteUser = factory.createHandlers(async ctx => {
	const { userId } = ctx.userInfo as UserInfo;
	const session = await mongoose.startSession();
	try {
		const { deleted, email } = await session.withTransaction(async () => {
			const userFilter = { user: userId };
			const ownerFilter = { owner: userId };
			const mutedByFilter = { mutedBy: userId };
			const deleted = (await User.findByIdAndUpdate(userId, { deleted: true }, { new: true }).select("+email").session(session)) as HydratedDocument<UserModel>;
			const email = deleted.email;
			await Promise.all([
				Favourite.deleteMany({ favouritedBy: userId }).session(session),
				Vote.deleteMany(userFilter).session(session),
				Bookmark.deleteMany({ bookmarkedBy: userId }).session(session),
				Follow.deleteMany({
					$or: [userFilter, { followedBy: userId }]
				}).session(session),
				FollowRequest.deleteMany({
					$or: [userFilter, { favouritedBy: userId }]
				}).session(session),
				List.deleteMany(ownerFilter).session(session),
				ListMember.deleteMany({
					$or: [userFilter, { list: await List.find(ownerFilter, { _id: 1 }) }]
				}).session(session),
				Block.deleteMany({
					$or: [userFilter, { blockedBy: userId }]
				}).session(session),
				MutedPost.deleteMany(mutedByFilter).session(session),
				MutedUser.deleteMany({
					$or: [userFilter, mutedByFilter]
				}).session(session),
				MutedWord.deleteMany(mutedByFilter).session(session),
				EmailVerification.deleteMany(userFilter).session(session),
				RefreshToken.deleteMany(userFilter).session(session),
				PasswordReset.deleteMany(userFilter).session(session),
				Settings.deleteMany(userFilter).session(session)
			]);
			return { deleted, email };
		});
		if (email) {
			await emailController.sendEmail(noReplyEmail, email, `Goodbye, ${deleted.handle}`, emailTemplates.notifications.deleted(deleted.handle));
		}
		return ctx.json({ deleted }, 200);
	} finally {
		await session.endSession();
	}
});