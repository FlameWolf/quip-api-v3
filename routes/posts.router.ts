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
	basePath.post("/create", requireAuthentication, validator("form", postCreateBody), postsController.createPost);
	basePath.get("/{:postId}", validator("param", postInteractParams), postsController.getPost);
	basePath.get("/{:postId}/quotes", validator("param", postInteractParams), validator("query", postQuotesQuery), postsController.getPostQuotes);
	basePath.get("/{:postId}/replies", validator("param", postInteractParams), validator("query", postRepliesQuery), postsController.getPostReplies);
	basePath.get("/{:postId}/parent", validator("param", postInteractParams), postsController.getPostParent);
	basePath.patch("/update/{:postId}", requireAuthentication, validator("param", postInteractParams), validator("json", postUpdateBody), postsController.updatePost);
	basePath.get("/favourite/{:postId}", requireAuthentication, validator("param", postInteractParams), favouritesController.addFavourite);
	basePath.get("/unfavourite/{:postId}", requireAuthentication, validator("param", postInteractParams), favouritesController.removeFavourite);
	basePath.get("/bookmark/{:postId}", requireAuthentication, validator("param", postInteractParams), bookmarksController.addBookmark);
	basePath.get("/unbookmark/{:postId}", requireAuthentication, validator("param", postInteractParams), bookmarksController.removeBookmark);
	basePath.post("/quote/{:postId}", requireAuthentication, validator("param", postInteractParams), validator("form", postCreateBody), postsController.quotePost);
	basePath.get("/repeat/{:postId}", requireAuthentication, validator("param", postInteractParams), postsController.repeatPost);
	basePath.get("/unrepeat/{:postId}", requireAuthentication, validator("param", postInteractParams), postsController.unrepeatPost);
	basePath.post("/reply/{:postId}", requireAuthentication, validator("param", postInteractParams), validator("form", postCreateBody), postsController.replyToPost);
	basePath.get("/mute/{:postId}", requireAuthentication, validator("param", postInteractParams), mutesController.mutePost);
	basePath.get("/unmute/{:postId}", requireAuthentication, validator("param", postInteractParams), mutesController.unmutePost);
	basePath.get("/vote/{:postId}", requireAuthentication, validator("param", postInteractParams), validator("query", postVoteQuery), postsController.castVote);
	basePath.delete("/delete/{:postId}", requireAuthentication, validator("param", postInteractParams), postsController.deletePost);
};