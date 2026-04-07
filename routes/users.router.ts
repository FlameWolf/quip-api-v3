"use strict";

import requireAuthentication from "../middleware/requireAuthentication.ts";
import { validator } from "hono-openapi";
import { actionReasonQuery, userBookmarksQuery, userFavouritesQuery, userFollowsQuery, userInteractParams, userMentionsQuery, userPostsQuery, userTopmostParams, userTopmostQuery, userVotesQuery } from "../requestDefinitions/users.requests.ts";
import * as usersController from "../controllers/users.controller.ts";
import * as followsController from "../controllers/follows.controller.ts";
import * as followRequestsController from "../controllers/follow-requests.controller.ts";
import * as mutesController from "../controllers/mutes.controller.ts";
import * as blocksController from "../controllers/blocks.controller.ts";
import type { Hono } from "hono";

export default (basePath: Hono) => {
	basePath.use(validator("param", userInteractParams));
	basePath.get("/{:handle}", usersController.getUser);
	basePath.get("/{:handle}/posts", validator("query", userPostsQuery), usersController.getUserPosts);
	basePath.get("/{:handle}/topmost/{:period}", validator("param", userTopmostParams), validator("query", userTopmostQuery), usersController.getUserTopmost);
	basePath.get("/{:handle}/mentions", validator("query", userMentionsQuery), usersController.getUserMentions);
	basePath.get("/follow/{:handle}", requireAuthentication, followsController.followUser);
	basePath.get("/cancel-req/{:handle}", requireAuthentication, followRequestsController.cancelFollowRequest);
	basePath.get("/unfollow/{:handle}", requireAuthentication, followsController.unfollowUser);
	basePath.get("/mute/{:handle}", requireAuthentication, validator("query", actionReasonQuery), mutesController.muteUser);
	basePath.get("/unmute/{:handle}", requireAuthentication, mutesController.unmuteUser);
	basePath.get("/block/{:handle}", requireAuthentication, validator("query", actionReasonQuery), blocksController.blockUser);
	basePath.get("/unblock/{:handle}", requireAuthentication, blocksController.unblockUser);
	basePath.get("/{:handle}/favourites", requireAuthentication, validator("query", userFavouritesQuery), usersController.getUserFavourites);
	basePath.get("/{:handle}/votes", requireAuthentication, validator("query", userVotesQuery), usersController.getUserVotes);
	basePath.get("/{:handle}/bookmarks", requireAuthentication, validator("query", userBookmarksQuery), usersController.getUserBookmarks);
	basePath.get("/{:handle}/following", requireAuthentication, validator("query", userFollowsQuery), usersController.getUserFollowing);
	basePath.get("/{:handle}/followers", requireAuthentication, validator("query", userFollowsQuery), usersController.getUserFollowers);
};