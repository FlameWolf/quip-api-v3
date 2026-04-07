"use strict";

import requireAuthentication from "../middleware/requireAuthentication.ts";
import { validator } from "hono-openapi";
import * as userController from "../controllers/users.controller.ts";
import * as listsController from "../controllers/lists.controller.ts";
import type { Hono } from "hono";
import { listCreateBody, listMemberBody, listMembersQuery, listPostsQuery, listsQuery, listUpdateBody } from "../requestDefinitions/lists.requests.ts";

export default (basePath: Hono) => {
	basePath.use(requireAuthentication);
	basePath.get("/", validator("query", listsQuery), userController.getLists);
	basePath.post("/create", validator("json", listCreateBody), listsController.createList);
	basePath.post("/update", validator("json", listUpdateBody), listsController.updateList);
	basePath.post("/add-member", validator("json", listMemberBody), listsController.addMember);
	basePath.post("/remove-member", validator("json", listMemberBody), listsController.removeMember);
	basePath.delete("/delete/:name", listsController.deleteList);
	basePath.get("/:name/members", validator("query", listMembersQuery), userController.getListMembers);
	basePath.get("/:name/posts", validator("query", listPostsQuery), listsController.getPosts);
};