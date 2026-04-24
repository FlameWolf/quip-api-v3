"use strict";

import { Hono } from "hono";
import requireAuthentication from "../middleware/requireAuthentication.ts";
import * as usersController from "../controllers/users.controller.ts";
import * as followsController from "../controllers/follows.controller.ts";
import * as followRequestsController from "../controllers/follow-requests.controller.ts";
import * as mutesController from "../controllers/mutes.controller.ts";
import * as blocksController from "../controllers/blocks.controller.ts";

export default new Hono()
	.get("/:handle", ...usersController.getUser)
	.get("/:handle/posts", ...usersController.getUserPosts)
	.get("/:handle/topmost/:period?", ...usersController.getUserTopmost)
	.get("/:handle/mentions", ...usersController.getUserMentions)
	.get("/follow/:handle", requireAuthentication, ...followsController.followUser)
	.get("/cancel-req/:handle", requireAuthentication, ...followRequestsController.cancelFollowRequest)
	.get("/unfollow/:handle", requireAuthentication, ...followsController.unfollowUser)
	.get("/mute/:handle", requireAuthentication, ...mutesController.muteUser)
	.get("/unmute/:handle", requireAuthentication, ...mutesController.unmuteUser)
	.get("/block/:handle", requireAuthentication, ...blocksController.blockUser)
	.get("/unblock/:handle", requireAuthentication, ...blocksController.unblockUser)
	.get("/:handle/favourites", requireAuthentication, ...usersController.getUserFavourites)
	.get("/:handle/votes", requireAuthentication, ...usersController.getUserVotes)
	.get("/:handle/bookmarks", requireAuthentication, ...usersController.getUserBookmarks)
	.get("/:handle/following", requireAuthentication, ...usersController.getUserFollowing)
	.get("/:handle/followers", requireAuthentication, ...usersController.getUserFollowers);