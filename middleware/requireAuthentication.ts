"use strict";

import { createFactory } from "hono/factory";

const factory = createFactory();
const requireAuthentication = factory.createMiddleware(async (ctx, next) => {
	if (!ctx.userInfo) {
		return ctx.body(null, 401);
	}
	await next();
});

export default requireAuthentication;