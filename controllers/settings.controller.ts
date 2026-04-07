"use strict";

import { ObjectId } from "mongodb";
import { setProperty, getProperty } from "../library.ts";
import Settings from "../models/settings.model.ts";
import type { SettingBody } from "../requestDefinitions/settings.requests.ts";
import type { Handler } from "hono";

export const getSettingsByUserId = async (userId: string | ObjectId) => {
	const param = { user: userId };
	const settings = await Settings.findOne(param);
	if (!settings) {
		return await new Settings(param).save();
	}
	return settings;
};
export const updateSettingsByUserId = async (userId: string | ObjectId, settings: Dictionary) =>
	await Settings.findOneAndUpdate(
		{
			user: userId
		},
		settings,
		{
			new: true,
			upsert: true
		}
	);
export const getSettings: Handler = async ctx => {
	const userId = (ctx.req.userInfo as UserInfo).userId;
	return ctx.json({ settings: await getSettingsByUserId(userId) }, 200);
};
export const getSettingByPath: Handler = async ctx => {
	const { req } = ctx;
	const path = req.path;
	const userId = (req.userInfo as UserInfo).userId;
	const settings = await getSettingsByUserId(userId);
	const value = getProperty(settings, path);
	return ctx.json({ [path]: value }, 200);
};
export const updateSettings: Handler = async ctx => {
	const { req } = ctx;
	const settings = (await req.json()) as SettingBody;
	const userId = (req.userInfo as UserInfo).userId;
	const updated = await updateSettingsByUserId(userId, settings);
	return ctx.json({ updated }, 200);
};
export const updateSettingByPath: Handler = async ctx => {
	const { req } = ctx;
	const path = req.path;
	const value = req.query("value");
	const userId = (req.userInfo as UserInfo).userId;
	const settings = {};
	setProperty(settings, path, value);
	const updated = await updateSettingsByUserId(userId, settings);
	return ctx.json({ updated }, 200);
};