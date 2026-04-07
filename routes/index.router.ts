"use strict";

import requireAuthentication from "../middleware/requireAuthentication.ts";
import { describeRoute, validator } from "hono-openapi";
import { activityQuery, forgotPasswordBody, hashtagQuery, resetPasswordBody, timelineQuery, topmostQuery } from "../requestDefinitions/index.requests.ts";
import * as indexController from "../controllers/index.controller.ts";
import type { Hono } from "hono";

export default (basePath: Hono) => {
	basePath.get(
		"/",
		describeRoute({
			hide: true
		}),
		async ctx => {
			if (process.env.NODE_ENV !== "production") {
				return ctx.redirect("/swagger");
			}
			return ctx.status(404);
		}
	);
	basePath.get("/health", async ctx => {
		return ctx.text("OK", 200);
	});
	basePath.get("/timeline", requireAuthentication, validator("query", timelineQuery), indexController.timeline);
	basePath.get("/activity/:period", requireAuthentication, validator("query", activityQuery), indexController.activity);
	basePath.get("/topmost/:period", validator("query", topmostQuery), indexController.topmost);
	basePath.get("/hashtag/:name", validator("query", hashtagQuery), indexController.hashtag);
	basePath.get("/reject-email/:token", indexController.rejectEmail);
	basePath.get("/verify-email/:token", indexController.verifyEmail);
	basePath.post("/forgot-password", validator("json", forgotPasswordBody), indexController.forgotPassword);
	basePath.post("/reset-password/:token", validator("json", resetPasswordBody), indexController.resetPassword);
};