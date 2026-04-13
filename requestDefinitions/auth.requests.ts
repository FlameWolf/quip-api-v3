"use strict";

import { type } from "arktype";

export const credentialsBody = type({
	handle: "string",
	password: "string"
});
export const refreshTokenHeaders = type({
	"x-slug": "string",
	"x-uid": "string"
});
export const refreshTokenBody = type({
	refreshToken: "string"
});
export const revokeTokenParams = type({
	token: "string"
});