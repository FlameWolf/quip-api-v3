"use strict";

import { Hono } from "hono";
import requireAuthentication from "../middleware/requireAuthentication.ts";
import * as settingsController from "../controllers/settings.controller.ts";
import * as mutesController from "../controllers/mutes.controller.ts";
import * as usersController from "../controllers/users.controller.ts";
import * as followRequestsController from "../controllers/follow-requests.controller.ts";

export default new Hono()
	.use(requireAuthentication)
	.post("/", ...settingsController.updateSettings)
	.get("/", ...settingsController.getSettings)
	.post("/mute", ...mutesController.muteWord)
	.post("/unmute", ...mutesController.unmuteWord)
	.post("/sent-reqs", ...usersController.getUserFollowRequestsSent)
	.post("/received-reqs", ...usersController.getUserFollowRequestsReceived)
	.get("/accept-req/:requestId", ...followRequestsController.acceptFollowRequest)
	.post("/accept-reqs", ...followRequestsController.acceptSelectedFollowRequests)
	.get("/accept-all-reqs", ...followRequestsController.acceptAllFollowRequests)
	.get("/reject-req/:requestId", ...followRequestsController.rejectFollowRequest)
	.post("/reject-reqs", ...followRequestsController.rejectSelectedFollowRequests)
	.get("/reject-all-reqs", ...followRequestsController.rejectAllFollowRequests)
	.get("/blocked", ...usersController.getBlocks)
	.get("/muted/users", ...usersController.getMutedUsers)
	.get("/muted/posts", ...usersController.getMutedPosts)
	.get("/muted/words", ...usersController.getMutedWords)
	.get("/pin/:postId", ...usersController.pinPost)
	.get("/unpin", ...usersController.unpinPost)
	.post("/update-email", ...usersController.updateEmail)
	.post("/change-password", ...usersController.changePassword)
	.get("/deactivate", ...usersController.deactivateUser)
	.get("/activate", ...usersController.activateUser)
	.delete("/delete", ...usersController.deleteUser)
	.put("/:path", ...settingsController.updateSettingByPath)
	.get("/:path", ...settingsController.getSettingByPath);