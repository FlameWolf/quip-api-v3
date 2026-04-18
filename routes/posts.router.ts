"use strict";

import { Hono } from "hono";
import requireAuthentication from "../middleware/requireAuthentication.ts";
import limitRequestBodySize from "../middleware/limitRequestBodySize.ts";
import * as postsController from "../controllers/posts.controller.ts";
import * as favouritesController from "../controllers/favourites.controller.ts";
import * as bookmarksController from "../controllers/bookmarks.controller.ts";
import * as mutesController from "../controllers/mutes.controller.ts";

export default new Hono()
	.get("/:postId", ...postsController.getPost)
	.get("/:postId/quotes", ...postsController.getPostQuotes)
	.get("/:postId/replies", ...postsController.getPostReplies)
	.get("/:postId/thread", ...postsController.getPostThread)
	.get("/:postId/parent", ...postsController.getPostParent)
	.post("/create", requireAuthentication, limitRequestBodySize, ...postsController.createPost)
	.patch("/update/:postId", requireAuthentication, ...postsController.updatePost)
	.get("/favourite/:postId", requireAuthentication, ...favouritesController.addFavourite)
	.get("/unfavourite/:postId", requireAuthentication, ...favouritesController.removeFavourite)
	.get("/bookmark/:postId", requireAuthentication, ...bookmarksController.addBookmark)
	.get("/unbookmark/:postId", requireAuthentication, ...bookmarksController.removeBookmark)
	.post("/quote/:postId", requireAuthentication, limitRequestBodySize, ...postsController.quotePost)
	.get("/repeat/:postId", requireAuthentication, ...postsController.repeatPost)
	.get("/unrepeat/:postId", requireAuthentication, ...postsController.unrepeatPost)
	.post("/reply/:postId", requireAuthentication, limitRequestBodySize, ...postsController.replyToPost)
	.get("/mute/:postId", requireAuthentication, ...mutesController.mutePost)
	.get("/unmute/:postId", requireAuthentication, ...mutesController.unmutePost)
	.get("/vote/:postId", requireAuthentication, ...postsController.castVote)
	.delete("/delete/:postId", requireAuthentication, ...postsController.deletePost);