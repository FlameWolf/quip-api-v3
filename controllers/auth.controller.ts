"use strict";

import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { invalidHandles, handleRegExp, passwordRegExp, rounds, authTokenLife } from "../library.ts";
import User from "../models/user.model.ts";
import RefreshToken from "../models/refresh-token.model.ts";
import type { CredentialsBody, RefreshTokenBody, RefreshTokenHeaders } from "../requestDefinitions/auth.requests.ts";
import type { Handler } from "hono";

const generateAuthToken = (handle: string, userId: string) => {
	return jwt.sign({ handle, userId }, process.env.JWT_AUTH_SECRET as string, { expiresIn: authTokenLife });
};
const generateRefreshToken = (handle: string, userId: string) => {
	return jwt.sign({ handle, userId }, process.env.JWT_REFRESH_SECRET as string);
};
const validateHandle = (handle: string) => {
	return handle && invalidHandles.indexOf(handle.trim().toLowerCase()) === -1 && handleRegExp.test(handle);
};
const validatePassword = (password: string) => {
	return password && passwordRegExp.test(password);
};
const authSuccess = async (handle: string, userId: string, includeRefreshToken = true) => {
	const payload: Dictionary = {
		userId,
		handle,
		authToken: generateAuthToken(handle, userId),
		createdAt: Date.now(),
		expiresIn: authTokenLife
	};
	if (includeRefreshToken) {
		const refreshToken = generateRefreshToken(handle, userId);
		payload.refreshToken = refreshToken;
		await new RefreshToken({
			user: userId,
			token: refreshToken
		}).save();
	}
	return payload;
};
export const signUp: Handler = async ctx => {
	const { handle, password } = (await ctx.req.json()) as CredentialsBody;
	if (!(validateHandle(handle) && validatePassword(password))) {
		return ctx.text("Invalid username/password", 400);
	}
	if (await User.countDocuments({ handle })) {
		return ctx.text("Username unavailable", 409);
	}
	const passwordHash = await bcrypt.hash(password, rounds);
	const user = await new User({ handle, password: passwordHash }).save();
	const userId = user._id;
	return ctx.json(await authSuccess(user.handle, userId.toString()), 201);
};
export const signIn: Handler = async ctx => {
	const { handle, password } = (await ctx.req.json()) as CredentialsBody;
	const user = await User.findOne({ handle }).select("+password");
	if (!user) {
		return ctx.text("User not found", 404);
	}
	const authStatus = await bcrypt.compare(password, user.password);
	if (!authStatus) {
		return ctx.text("Invalid credentials", 403);
	}
	const userId = user._id;
	return ctx.json(await authSuccess(user.handle, userId.toString()), 200);
};
export const refreshAuthToken: Handler = async ctx => {
	const { refreshToken } = (await ctx.req.json()) as RefreshTokenBody;
	const { "x-slug": handle, "x-uid": userId } = ctx.req.header() as RefreshTokenHeaders;
	const userInfo = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET as string) as UserInfo;
	const filter = { user: userId, token: refreshToken };
	if (userInfo.handle !== handle || userInfo.userId !== userId) {
		return ctx.text("Refresh token invalid", 401);
	}
	if (!(await RefreshToken.countDocuments(filter))) {
		return ctx.text("Refresh token revoked or expired", 401);
	}
	await RefreshToken.findOneAndUpdate(filter, { lastUsed: new Date() });
	return ctx.json(await authSuccess(handle, userId, false), 200);
};
export const revokeRefreshToken: Handler = async ctx => {
	const deleted = await RefreshToken.findOneAndDelete({ token: ctx.req.param("token") });
	return ctx.status(deleted ? 200 : 404);
};