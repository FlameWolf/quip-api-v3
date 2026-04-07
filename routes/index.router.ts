"use strict";

import requireAuthentication from "../middleware/requireAuthentication.ts";
import { validator } from "hono-openapi";
import { activityParams, activityQuery, emailApprovalParams, forgotPasswordBody, hashtagParams, hashtagQuery, resetPasswordBody, resetPasswordParams, timelineQuery, topmostParams, topmostQuery } from "../requestDefinitions/index.requests.ts";
import * as indexController from "../controllers/index.controller.ts";
import type { Hono } from "hono";

export default (basePath: Hono) => {
	basePath.get("/", async ctx => {
		if (process.env.NODE_ENV !== "production") {
			return ctx.redirect("/api-docs/v3");
		}
		return ctx.status(404);
	});
	basePath.get("/health", async ctx => {
		return ctx.text("OK", 200);
	});
	basePath.get("/timeline", requireAuthentication, validator("query", timelineQuery), indexController.timeline);
	basePath.get("/activity/{:period}", requireAuthentication, validator("param", activityParams), validator("query", activityQuery), indexController.activity);
	basePath.get("/topmost/{:period}", validator("param", topmostParams), validator("query", topmostQuery), indexController.topmost);
	basePath.get("/hashtag/{:name}", validator("param", hashtagParams), validator("query", hashtagQuery), indexController.hashtag);
	basePath.get("/reject-email/{:token}", validator("param", emailApprovalParams), indexController.rejectEmail);
	basePath.get("/verify-email/{:token}", validator("param", emailApprovalParams), indexController.verifyEmail);
	basePath.post("/forgot-password", validator("json", forgotPasswordBody), indexController.forgotPassword);
	basePath.post("/reset-password/{:token}", validator("param", resetPasswordParams), validator("json", resetPasswordBody), indexController.resetPassword);
};