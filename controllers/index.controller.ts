"use strict";

import { ObjectId } from "mongodb";
import mongoose, { type InferSchemaType, type HydratedDocument } from "mongoose";
import bcrypt from "bcrypt";
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
import type { ForgotPasswordBody, HashtagQuery, ResetPasswordBody, TimelineQuery, TopmostQuery } from "../requestDefinitions/index.requests.ts";
import type { Handler } from "hono";

type UserModel = InferSchemaType<typeof User.schema>;
type EmailVerificationModel = InferSchemaType<typeof EmailVerification.schema>;
type PasswordResetModel = InferSchemaType<typeof PasswordReset.schema>;

export const timeline: Handler = async ctx => {
	const { req } = ctx;
	const { includeRepeats, includeReplies, lastPostId } = req.query() as TimelineQuery;
	const userId = (req.userInfo as UserInfo).userId;
	const posts = await User.aggregate(timelineAggregationPipeline(userId, includeRepeats !== "false", includeReplies !== "false", lastPostId));
	return ctx.json({ posts }, 200);
};
export const activity: Handler = async ctx => {
	const { req } = ctx;
	const period = req.param("period");
	const lastEntryId = req.query("lastEntryId");
	const userId = (req.userInfo as UserInfo).userId;
	const entries = await User.aggregate(activityAggregationPipeline(userId, period, lastEntryId as string));
	return ctx.json({ entries }, 200);
};
export const topmost: Handler = async ctx => {
	const { req } = ctx;
	const period = req.param("period");
	const { lastScore, lastPostId } = req.query() as TopmostQuery;
	const posts = await Post.aggregate(topmostAggregationPipeline((req.userInfo as UserInfo)?.userId, period, lastScore, lastPostId));
	return ctx.json({ posts }, 200);
};
export const hashtag: Handler = async ctx => {
	const { req } = ctx;
	const tagName = req.param("name") as string;
	const { sortBy, lastScore, lastPostId } = req.query() as HashtagQuery;
	const posts = await Post.aggregate(hashtagAggregationPipeline(tagName, (req.userInfo as UserInfo)?.userId, sortBy, lastScore, lastPostId));
	return ctx.json({ posts }, 200);
};
export const rejectEmail: Handler = async ctx => {
	const token = ctx.req.param("token");
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
		return ctx.status(200);
	} finally {
		await session.endSession();
	}
};
export const verifyEmail: Handler = async ctx => {
	const token = ctx.req.param("token");
	const emailVerification = await EmailVerification.findOne({ token });
	if (!emailVerification) {
		return ctx.text("Verification token not found or expired", 404);
	}
	const email = emailVerification.email as string;
	const user = (await User.findByIdAndUpdate(emailVerification.user, { email })) as HydratedDocument<UserModel>;
	await emailController.sendEmail(noReplyEmail, email, "Email address change verified", emailTemplates.notifications.emailVerified(user.handle, email));
	return ctx.status(200);
};
export const forgotPassword: Handler = async ctx => {
	const { handle, email } = (await ctx.req.json()) as ForgotPasswordBody;
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
};
export const resetPassword: Handler = async ctx => {
	const { req } = ctx;
	const token = req.param("token");
	const password = ((await req.json()) as ResetPasswordBody).password;
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
		return ctx.status(200);
	} finally {
		await session.endSession();
	}
};