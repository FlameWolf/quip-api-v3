"use strict";

import { Hono } from "hono";
import * as searchController from "../controllers/search.controller.ts";

export default new Hono()
	.get("/", ...searchController.searchPosts)
	.get("/nearby", ...searchController.nearbyPosts)
	.get("/users", ...searchController.searchUsers);