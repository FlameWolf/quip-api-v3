"use strict";

import requireAuthentication from "../middleware/requireAuthentication.ts";
import { validator } from "hono-openapi";
import * as userController from "../controllers/users.controller.ts";
import * as listsController from "../controllers/lists.controller.ts";
import type { Hono } from "hono";
import { listCreateBody, listInteractParams, listMemberBody, listMembersQuery, listPostsQuery, listsQuery, listUpdateBody } from "../requestDefinitions/lists.requests.ts";

export default (basePath: Hono) => {
	const authenticatedPath = basePath.use(requireAuthentication);
	authenticatedPath.get("/", validator("query", listsQuery), userController.getLists);
	authenticatedPath.post("/create", validator("json", listCreateBody), listsController.createList);
	authenticatedPath.post("/update", validator("json", listUpdateBody), listsController.updateList);
	authenticatedPath.post("/add-member", validator("json", listMemberBody), listsController.addMember);
	authenticatedPath.post("/remove-member", validator("json", listMemberBody), listsController.removeMember);
	authenticatedPath.delete("/delete/{:name}", validator("param", listInteractParams), listsController.deleteList);
	authenticatedPath.get("/{:name}/members", validator("param", listInteractParams), validator("query", listMembersQuery), userController.getListMembers);
	authenticatedPath.get("/{:name}/posts", validator("param", listInteractParams), validator("query", listPostsQuery), listsController.getPosts);
};