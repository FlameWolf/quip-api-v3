"use strict";

import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import requireAuthentication from "../middleware/requireAuthentication.ts";
import * as indexController from "../controllers/index.controller.ts";

export default new Hono()
	.get(
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
	)
	.get("/health", async ctx => {
		return ctx.text("OK", 200);
	})
	.get("/timeline", requireAuthentication, ...indexController.timeline)
	.get("/activity/:period", requireAuthentication, ...indexController.activity)
	.get("/topmost/:period", ...indexController.topmost)
	.get("/hashtag/:name", ...indexController.hashtag)
	.get("/reject-email/:token", ...indexController.rejectEmail)
	.get("/verify-email/:token", ...indexController.verifyEmail)
	.post("/forgot-password", ...indexController.forgotPassword)
	.post("/reset-password/:token", ...indexController.resetPassword);