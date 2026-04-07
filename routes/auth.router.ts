"use strict";

import { validator } from "hono-openapi";
import { credentialsBody, refreshTokenBody, refreshTokenHeaders } from "../requestDefinitions/auth.requests.ts";
import * as authController from "../controllers/auth.controller.ts";
import type { Hono } from "hono";

export default (basePath: Hono) => {
	basePath.post("/sign-up", validator("json", credentialsBody), authController.signUp);
	basePath.post("/sign-in", validator("json", credentialsBody), authController.signIn);
	basePath.post("/refresh-token", validator("header", refreshTokenHeaders), validator("json", refreshTokenBody), authController.refreshAuthToken);
	basePath.get("/revoke-token/:token", authController.revokeRefreshToken);
};