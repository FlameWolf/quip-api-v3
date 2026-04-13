"use strict";

import { Hono } from "hono";
import * as authController from "../controllers/auth.controller.ts";

export default new Hono()
	.post("/sign-up", ...authController.signUp)
	.post("/sign-in", ...authController.signIn)
	.post("/refresh-token", ...authController.refreshAuthToken)
	.get("/revoke-token/:token", ...authController.revokeRefreshToken);