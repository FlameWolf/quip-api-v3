"use strict";

import { ObjectId } from "mongodb";
import mongoose, { type InferSchemaType, type HydratedDocument } from "mongoose";
import bcrypt from "bcrypt";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { activityParams, activityQuery, emailApprovalParams, forgotPasswordBody, hashtagParams, hashtagQuery, resetPasswordBody, resetPasswordParams, timelineQuery, topmostParams, topmostQuery } from "../requestDefinitions/index.requests.ts";
import { noReplyEmail, emailTemplates, passwordRegExp, rounds } from "../library.ts";
import timelineAggregationPipeline from "../db/pipelines/timeline.ts";
import activityAggregationPipeline from "../db/pipelines/activity.ts";
import topmostAggregationPipeline from "../db/pipelines/topmost.ts";
import hashtagAggregationPipeline from "../db/pipelines/hashtag.ts";
import User from "../models/user.model.ts";
import Post from "../models/post.model.ts";
import EmailVerification from "../models/email-verification.model.ts";
import PasswordReset from "../models/password-reset.model.ts";
import * as emailController from "./email.controller.ts";

type UserModel = InferSchemaType<typeof User.schema>;
type EmailVerificationModel = InferSchemaType<typeof EmailVerification.schema>;
type PasswordResetModel = InferSchemaType<typeof PasswordReset.schema>;

const factory = createFactory();
export const timeline = factory.createHandlers(validator("query", timelineQuery), async ctx => {
	const { includeRepeats, includeReplies, lastPostId } = ctx.req.valid("query");
	const { userId } = ctx.userInfo as UserInfo;
	const posts = await User.aggregate(timelineAggregationPipeline(userId, includeRepeats !== "false", includeReplies !== "false", lastPostId));
	return ctx.json({ posts }, 200);
});
export const activity = factory.createHandlers(validator("param", activityParams), validator("query", activityQuery), async ctx => {
	const { req } = ctx;
	const { period } = req.valid("param");
	const { lastEntryId } = req.valid("query");
	const { userId } = ctx.userInfo as UserInfo;
	const entries = await User.aggregate(activityAggregationPipeline(userId, period, lastEntryId as string));
	return ctx.json({ entries }, 200);
});
export const topmost = factory.createHandlers(validator("param", topmostParams), validator("query", topmostQuery), async ctx => {
	const { req } = ctx;
	const { period } = req.valid("param");
	const { lastScore, lastPostId } = req.valid("query");
	const posts = await Post.aggregate(topmostAggregationPipeline((ctx.userInfo as UserInfo)?.userId, period, lastScore, lastPostId));
	return ctx.json({ posts }, 200);
});
export const hashtag = factory.createHandlers(validator("param", hashtagParams), validator("query", hashtagQuery), async ctx => {
	const { req } = ctx;
	const { name: tagName } = req.valid("param");
	const { sortBy, lastScore, lastPostId } = req.valid("query");
	const posts = await Post.aggregate(hashtagAggregationPipeline(tagName, (ctx.userInfo as UserInfo)?.userId, sortBy, lastScore, lastPostId));
	return ctx.json({ posts }, 200);
});
export const rejectEmail = factory.createHandlers(validator("param", emailApprovalParams), async ctx => {
	const { token } = ctx.req.valid("param");
	const session = await mongoose.startSession();
	try {
		const emailVerification = await EmailVerification.findOne({ token });
		if (!emailVerification) {
			return ctx.text("Verification token not found or expired", 404);
		}
		const previousEmail = emailVerification.previousEmail;
		const user = await session.withTransaction(async () => {
			const updatedUser = (await User.findByIdAndUpdate(emailVerification.user, { email: emailVerification.previousEmail }).session(session)) as UserModel;
			await EmailVerification.deleteOne(emailVerification as EmailVerificationModel).session(session);
			return updatedUser;
		});
		if (previousEmail) {
			await emailController.sendEmail(noReplyEmail, previousEmail, "Email address change rejected", emailTemplates.notifications.emailRejected(user.handle, emailVerification.email as string));
		}
		return ctx.body(null, 200);
	} finally {
		await session.endSession();
	}
});
export const verifyEmail = factory.createHandlers(validator("param", emailApprovalParams), async ctx => {
	const { token } = ctx.req.valid("param");
	const emailVerification = await EmailVerification.findOne({ token });
	if (!emailVerification) {
		return ctx.text("Verification token not found or expired", 404);
	}
	const email = emailVerification.email as string;
	const user = (await User.findByIdAndUpdate(emailVerification.user, { email })) as HydratedDocument<UserModel>;
	await emailController.sendEmail(noReplyEmail, email, "Email address change verified", emailTemplates.notifications.emailVerified(user.handle, email));
	return ctx.body(null, 200);
});
export const forgotPassword = factory.createHandlers(validator("json", forgotPasswordBody), async ctx => {
	const { handle, email } = ctx.req.valid("json");
	const user = await User.findOne({ handle, deleted: false }).select("+email");
	if (!user) {
		return ctx.text("User not found", 400);
	}
	if (user.email !== email) {
		return ctx.text("Email address is incorrect or unverified", 403);
	}
	const passwordReset = await new PasswordReset({
		user: user._id,
		token: new ObjectId()
	}).save();
	await emailController.sendEmail(noReplyEmail, email, "Reset password", emailTemplates.actions.resetPassword(handle, `${process.env.ALLOW_ORIGIN}/reset-password/${passwordReset.token}`));
	return ctx.json({ passwordReset }, 200);
});
export const resetPassword = factory.createHandlers(validator("param", resetPasswordParams), validator("json", resetPasswordBody), async ctx => {
	const { req } = ctx;
	const { token } = req.valid("param");
	const { password } = req.valid("json");
	const session = await mongoose.startSession();
	try {
		const passwordReset = await PasswordReset.findOne({ token });
		if (!passwordReset) {
			return ctx.text("Reset token not found or expired", 404);
		}
		if (!(password && passwordRegExp.test(password))) {
			return ctx.text("Invalid password", 400);
		}
		const user = await session.withTransaction(async () => {
			const passwordHash = bcrypt.hashSync(password, rounds);
			const updatedUser = (await User.findByIdAndUpdate(passwordReset.user, { password: passwordHash }).select("+email").session(session)) as UserModel;
			await PasswordReset.deleteOne(passwordReset as PasswordResetModel).session(session);
			return updatedUser;
		});
		await emailController.sendEmail(noReplyEmail, user.email as string, "Password reset", emailTemplates.notifications.passwordReset(user.handle));
		return ctx.body(null, 200);
	} finally {
		await session.endSession();
	}
});