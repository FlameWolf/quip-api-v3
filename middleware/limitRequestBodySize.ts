"use strict";

import { bodyLimit } from "hono/body-limit";
import { megaByte } from "../library.ts";

const limitRequestBodySize = bodyLimit({
	maxSize: megaByte * 5,
	onError: async ctx => ctx.text("Content too large", 413)
});

export default limitRequestBodySize;