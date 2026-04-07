"use strict";

import { validator } from "hono-openapi";
import * as searchController from "../controllers/search.controller.ts";
import type { Hono } from "hono";
import { searchNearbyQuery, searchQuery, searchUsersQuery } from "../requestDefinitions/search.requests.ts";

export default (basePath: Hono) => {
	basePath.get("/", validator("query", searchQuery), searchController.searchPosts);
	basePath.get("/nearby", validator("query", searchNearbyQuery), searchController.nearbyPosts);
	basePath.get("/users", validator("query", searchUsersQuery), searchController.searchUsers);
};