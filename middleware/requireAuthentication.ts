"use strict";

import { createFactory } from "hono/factory";

const factory = createFactory();
const requireAuthentication = factory.createMiddleware(async (ctx, next) => {
	if (!ctx.userInfo) {
		return ctx.status(401);
	}
	await next();
});

export default requireAuthentication;