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
	basePath.get("/:postId", postsController.getPost);
	basePath.get("/:postId/quotes", validator("query", postQuotesQuery), postsController.getPostQuotes);
	basePath.get("/:postId/replies", validator("query", postRepliesQuery), postsController.getPostReplies);
	basePath.get("/:postId/parent", postsController.getPostParent);
	basePath.patch("/update/:postId", requireAuthentication, validator("json", postUpdateBody), postsController.updatePost);
	basePath.get("/favourite/:postId", requireAuthentication, favouritesController.addFavourite);
	basePath.get("/unfavourite/:postId", requireAuthentication, favouritesController.removeFavourite);
	basePath.get("/bookmark/:postId", requireAuthentication, bookmarksController.addBookmark);
	basePath.get("/unbookmark/:postId", requireAuthentication, bookmarksController.removeBookmark);
	basePath.post("/quote/:postId", requireAuthentication, validator("form", postCreateBody), postsController.quotePost);
	basePath.get("/repeat/:postId", requireAuthentication, postsController.repeatPost);
	basePath.get("/unrepeat/:postId", requireAuthentication, postsController.unrepeatPost);
	basePath.post("/reply/:postId", requireAuthentication, validator("form", postCreateBody), postsController.replyToPost);
	basePath.get("/mute/:postId", requireAuthentication, mutesController.mutePost);
	basePath.get("/unmute/:postId", requireAuthentication, mutesController.unmutePost);
	basePath.get("/vote/:postId", requireAuthentication, validator("query", postVoteQuery), postsController.castVote);
	basePath.delete("/delete/:postId", requireAuthentication, postsController.deletePost);
};