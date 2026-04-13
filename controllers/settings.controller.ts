"use strict";

import { ObjectId } from "mongodb";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { settingBody, settingInteractParams, updateSettingQuery } from "../requestDefinitions/settings.requests.ts";
import { setProperty, getProperty } from "../library.ts";
import Settings from "../models/settings.model.ts";

const factory = createFactory();
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
export const getSettings = factory.createHandlers(async ctx => {
	const { userId } = ctx.userInfo as UserInfo;
	return ctx.json({ settings: await getSettingsByUserId(userId) }, 200);
});
export const getSettingByPath = factory.createHandlers(validator("param", settingInteractParams), async ctx => {
	const { path } = ctx.req.valid("param");
	const { userId } = ctx.userInfo as UserInfo;
	const settings = await getSettingsByUserId(userId);
	const value = getProperty(settings, path);
	return ctx.json({ [path]: value }, 200);
});
export const updateSettings = factory.createHandlers(validator("json", settingBody), async ctx => {
	const settings = ctx.req.valid("json");
	const { userId } = ctx.userInfo as UserInfo;
	const updated = await updateSettingsByUserId(userId, settings);
	return ctx.json({ updated }, 200);
});
export const updateSettingByPath = factory.createHandlers(validator("param", settingInteractParams), validator("query", updateSettingQuery), async ctx => {
	const { req } = ctx;
	const { path } = req.valid("param");
	const { value } = req.valid("query");
	const { userId } = ctx.userInfo as UserInfo;
	const settings = {};
	setProperty(settings, path, value);
	const updated = await updateSettingsByUserId(userId, settings);
	return ctx.json({ updated }, 200);
});