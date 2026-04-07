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
	const interactPath = basePath.use(validator("param", userInteractParams));
	const authenticatedPath = interactPath.use(requireAuthentication);
	interactPath.get("/{:handle}", usersController.getUser);
	interactPath.get("/{:handle}/posts", validator("query", userPostsQuery), usersController.getUserPosts);
	interactPath.get("/{:handle}/topmost/{:period}", validator("param", userTopmostParams), validator("query", userTopmostQuery), usersController.getUserTopmost);
	interactPath.get("/{:handle}/mentions", validator("query", userMentionsQuery), usersController.getUserMentions);
	authenticatedPath.get("/follow/{:handle}", followsController.followUser);
	authenticatedPath.get("/cancel-req/{:handle}", followRequestsController.cancelFollowRequest);
	authenticatedPath.get("/unfollow/{:handle}", followsController.unfollowUser);
	authenticatedPath.get("/mute/{:handle}", validator("query", actionReasonQuery), mutesController.muteUser);
	authenticatedPath.get("/unmute/{:handle}", mutesController.unmuteUser);
	authenticatedPath.get("/block/{:handle}", validator("query", actionReasonQuery), blocksController.blockUser);
	authenticatedPath.get("/unblock/{:handle}", blocksController.unblockUser);
	authenticatedPath.get("/{:handle}/favourites", validator("query", userFavouritesQuery), usersController.getUserFavourites);
	authenticatedPath.get("/{:handle}/votes", validator("query", userVotesQuery), usersController.getUserVotes);
	authenticatedPath.get("/{:handle}/bookmarks", validator("query", userBookmarksQuery), usersController.getUserBookmarks);
	authenticatedPath.get("/{:handle}/following", validator("query", userFollowsQuery), usersController.getUserFollowing);
	authenticatedPath.get("/{:handle}/followers", validator("query", userFollowsQuery), usersController.getUserFollowers);
};