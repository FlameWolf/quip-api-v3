"use strict";

import { Hono } from "hono";
import requireAuthentication from "../middleware/requireAuthentication.ts";
import * as userController from "../controllers/users.controller.ts";
import * as listsController from "../controllers/lists.controller.ts";

export default new Hono()
	.use(requireAuthentication)
	.get("/", ...userController.getLists)
	.post("/create", ...listsController.createList)
	.post("/update", ...listsController.updateList)
	.post("/add-member", ...listsController.addMember)
	.post("/remove-member", ...listsController.removeMember)
	.delete("/delete/:name", ...listsController.deleteList)
	.get("/:name/members", ...userController.getListMembers)
	.get("/:name/posts", ...listsController.getPosts);