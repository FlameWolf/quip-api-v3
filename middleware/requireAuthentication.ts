"use strict";

import type { Handler } from "hono";

const requireAuthentication: Handler = async (ctx, next) => {
	if (!ctx.req.userInfo) {
		return ctx.status(401);
	}
	await next();
};

export default requireAuthentication;