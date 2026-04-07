"use strict";

import requireAuthentication from "../middleware/requireAuthentication.ts";
import { validator } from "hono-openapi";
import * as postsController from "../controllers/posts.controller.ts";
import * as favouritesController from "../controllers/favourites.controller.ts";
import * as bookmarksController from "../controllers/bookmarks.controller.ts";
import * as mutesController from "../controllers/mutes.controller.ts";
import type { Hono } from "hono";
import { postCreateBody, postInteractParams, postQuotesQuery, postRepliesQuery, postUpdateBody, postVoteQuery } from "../requestDefinitions/posts.requests.ts";

export default (basePath: Hono) => {
	const interactPath = basePath.use(validator("param", postInteractParams));
	const authenticatedPath = interactPath.use(requireAuthentication);
	basePath.post("/create", requireAuthentication, validator("json", postCreateBody), postsController.createPost);
	interactPath.get("/{:postId}", postsController.getPost);
	interactPath.get("/{:postId}/quotes", validator("query", postQuotesQuery), postsController.getPostQuotes);
	interactPath.get("/{:postId}/replies", validator("query", postRepliesQuery), postsController.getPostReplies);
	interactPath.get("/{:postId}/parent", postsController.getPostParent);
	authenticatedPath.patch("/update/{:postId}", validator("json", postUpdateBody), postsController.updatePost);
	authenticatedPath.get("/favourite/{:postId}", favouritesController.addFavourite);
	authenticatedPath.get("/unfavourite/{:postId}", favouritesController.removeFavourite);
	authenticatedPath.get("/bookmark/{:postId}", bookmarksController.addBookmark);
	authenticatedPath.get("/unbookmark/{:postId}", bookmarksController.removeBookmark);
	authenticatedPath.post("/quote/{:postId}", validator("json", postCreateBody), postsController.quotePost);
	authenticatedPath.get("/repeat/{:postId}", postsController.repeatPost);
	authenticatedPath.get("/unrepeat/{:postId}", postsController.unrepeatPost);
	authenticatedPath.post("/reply/{:postId}", validator("json", postCreateBody), postsController.replyToPost);
	authenticatedPath.get("/mute/{:postId}", mutesController.mutePost);
	authenticatedPath.get("/unmute/{:postId}", mutesController.unmutePost);
	authenticatedPath.get("/vote/{:postId}", validator("query", postVoteQuery), postsController.castVote);
	authenticatedPath.delete("/delete/{:postId}", postsController.deletePost);
};