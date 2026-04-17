"use strict";

import { ObjectId } from "mongodb";
import mongoose, { type HydratedDocument, type InferSchemaType } from "mongoose";
import { createFactory } from "hono/factory";
import { validator } from "hono-openapi";
import { postCreateBody, postInteractParams, postQuotesQuery, postRepliesQuery, postUpdateBody, postVoteQuery } from "../requestDefinitions/posts.requests.ts";
import cld from "cld";
import { v2 as cloudinary, type UploadApiErrorResponse, type UploadApiResponse } from "cloudinary";
import { Readable } from "node:stream";
import { emptyString, getUnicodeClusterCount, maxContentLength, getFileType, nullId, quoteScore, replyScore, voteScore, repeatScore, maxRowsPerFetch } from "../library.ts";
import postAggregationPipeline from "../db/pipelines/post.ts";
import postQuotesAggregationPipeline from "../db/pipelines/post-quotes.ts";
import postRepliesAggregationPipeline from "../db/pipelines/post-replies.ts";
import postThreadAggregationPipeline from "../db/pipelines/post-thread.ts";
import postParentAggregationPipeline from "../db/pipelines/post-parent.ts";
import Post from "../models/post.model.ts";
import Vote from "../models/vote.model.ts";
import User from "../models/user.model.ts";
import Favourite from "../models/favourite.model.ts";
import Bookmark from "../models/bookmark.model.ts";
import MutedPost from "../models/muted.post.model.ts";

type PostModel = InferSchemaType<typeof Post.schema>;
type AttachmentsModel = Required<PostModel>["attachments"];
type PollModel = Required<AttachmentsModel & Dictionary>["poll"];
type LanguageEntry = InferArrayElementType<PostModel["languages"]>;
type MentionEntry = InferArrayElementType<PostModel["mentions"]>;
type HashtagEntry = InferArrayElementType<PostModel["hashtags"]>;

const factory = createFactory();
export const findPostById = async (postId: string | ObjectId): Promise<HydratedDocument<PostModel>> => {
	const post = await Post.findById(postId);
	const repeatPost = post?.repeatPost;
	return repeatPost ? await findPostById(repeatPost as ObjectId) : (post as HydratedDocument<PostModel>);
};
export const validateContent = (content: string, poll?: PollModel, media?: File, postId?: string | ObjectId) => {
	if (!content.trim()) {
		if (poll || !(media || postId)) {
			throw new Error("No content");
		}
	}
	if (getUnicodeClusterCount(content) > maxContentLength) {
		throw new Error("Content too long");
	}
};
export const detectLanguages = async (value: string) => {
	if (value.trim()) {
		try {
			return (await cld.detect(value)).languages.map(language => language.code);
		} catch {
			return ["xx"];
		}
	}
	return [];
};
export const updateLanguages = async (post: Partial<PostModel> | DeepPartial<PostModel>) => {
	const languages = new Set(post.languages);
	const promises = [];
	const { content, attachments } = post;
	promises.push(content && (await detectLanguages(content)));
	if (attachments) {
		const { poll, mediaFile } = attachments;
		if (poll) {
			const { first, second, third, fourth } = poll;
			promises.push(first && (await detectLanguages(first)), second && (await detectLanguages(second)), third && (await detectLanguages(third)), fourth && (await detectLanguages(fourth)));
		}
		if (mediaFile) {
			const mediaDescription = mediaFile.description as string;
			promises.push(mediaDescription && (await detectLanguages(mediaDescription)));
		}
	}
	for (const language of (await Promise.all(promises)).flat()) {
		if (language) {
			languages.add(language as LanguageEntry);
		}
	}
	post.languages = Array.from(languages);
};
export const updateMentionsAndHashtags = async (content: string, post: Partial<PostModel> | DeepPartial<PostModel>) => {
	const postMentions = new Set(post.mentions?.map(mention => mention?.toString()));
	const postHashtags = new Set(post.hashtags);
	const contentMentions = content.match(/\B@\w+/g);
	const contentHashtags = content.match(/\B#(\p{L}\p{M}?)+/gu);
	if (contentMentions) {
		const users = await User.find(
			{
				handle: {
					$in: contentMentions.map(mention => mention.substring(1))
				},
				deactivated: false,
				deleted: false
			},
			{
				_id: 1
			}
		);
		users.map(user => user._id).forEach(userId => postMentions.add(userId.toString()));
	}
	if (contentHashtags) {
		contentHashtags.map(hashtag => hashtag.substring(1)).forEach(hashtag => postHashtags.add(hashtag as HashtagEntry));
	}
	post.mentions = postMentions.size > 0 ? Array.from(postMentions).map(mention => new ObjectId(mention) as MentionEntry) : undefined;
	post.hashtags = postHashtags.size > 0 ? Array.from(postHashtags) : undefined;
};
export const uploadFile = async (file: File): Promise<UploadApiResponse | UploadApiErrorResponse | undefined> => {
	const fileType = getFileType(file.type);
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				resource_type: fileType as any,
				folder: `${fileType}s`,
				filename_override: file.name,
				use_filename: true
			},
			(error, result) => {
				error ? reject(error) : resolve(result);
			}
		);
		Readable.from(file.stream()).pipe(uploadStream);
	});
};
export const createPost = factory.createHandlers(validator("form", postCreateBody), async ctx => {
	const { content = emptyString, poll, media, "media-description": mediaDescription, location } = ctx.req.valid("form");
	const { userId } = ctx.userInfo as UserInfo;
	try {
		validateContent(content, poll as PollModel, media as File);
	} catch (err) {
		return ctx.json(err, 400);
	}
	const model = {
		content,
		author: new ObjectId(userId),
		...((poll || media) && {
			attachments: {
				...(poll && { poll }),
				...(media && {
					mediaFile: {
						fileType: getFileType((media as File).type),
						src: (await uploadFile(media as File))?.secure_url,
						description: mediaDescription
					}
				})
			}
		}),
		...(location && { location })
	};
	await Promise.all([updateLanguages(model), content.trim() && updateMentionsAndHashtags(content, model)]);
	const session = await mongoose.startSession();
	try {
		const post = await session.withTransaction(async () => {
			const createdPost = await new Post(model).save({ session });
			await User.findOneAndUpdate(
				{
					_id: userId
				},
				{
					$addToSet: {
						posts: createdPost._id
					}
				}
			).session(session);
			return createdPost;
		});
		return ctx.json({ post }, 201);
	} finally {
		await session.endSession();
	}
});
export const updatePost = factory.createHandlers(validator("param", postInteractParams), validator("json", postUpdateBody), async ctx => {
	const { req } = ctx;
	const { postId } = req.valid("param");
	const { content = emptyString } = ctx.req.valid("json");
	const { userId } = ctx.userInfo as UserInfo;
	const session = await mongoose.startSession();
	try {
		if (!content.trim()) {
			return ctx.text("No content", 400);
		}
		const post = await findPostById(postId);
		if (!post) {
			return ctx.text("Post not found", 404);
		}
		if (post.author.toString() !== userId) {
			return ctx.text("You are not allowed to perform this action", 403);
		}
		if (post.__v > 0) {
			return ctx.text("Post was edited once and cannot be edited again", 422);
		}
		const { poll = undefined, mediaFile = undefined, post: quotedPostId } = post.attachments || ({} as AttachmentsModel & Dictionary);
		if (poll) {
			return ctx.text("Cannot edit a post that includes a poll", 422);
		}
		if (post.content === content) {
			return ctx.status(304);
		}
		const updated = await session.withTransaction(async () => {
			const originalPostId = post._id;
			const authorFilter = {
				author: {
					$nin: [userId]
				}
			};
			const postFilter = { post: originalPostId };
			const repliedPostId = post.replyTo;
			const mentions: Array<MentionEntry> = [];
			if (repliedPostId) {
				mentions.push(((await Post.findById(repliedPostId))?.author as MentionEntry) || nullId);
			}
			if (quotedPostId) {
				mentions.push(((await Post.findById(quotedPostId))?.author as MentionEntry) || nullId);
			}
			const model = {
				content,
				...(mediaFile && {
					attachments: {
						mediaFile: {
							description: mediaFile.description
						}
					}
				}),
				mentions,
				score: 0,
				$inc: { __v: 1 }
			};
			await Promise.all([updateLanguages(model), updateMentionsAndHashtags(content, model)]);
			delete model.attachments;
			const updatedPost = await Post.findByIdAndUpdate(originalPostId, model, { new: true }).session(session);
			await Promise.all([
				Post.updateMany(
					{
						"attachments.post": originalPostId,
						...authorFilter
					},
					{
						"attachments.post": nullId
					}
				).session(session),
				Post.updateMany(
					{
						replyTo: originalPostId,
						...authorFilter
					},
					{
						replyTo: nullId
					}
				).session(session),
				Post.deleteMany({
					repeatPost: originalPostId
				}).session(session),
				Favourite.deleteMany(postFilter).session(session),
				Bookmark.deleteMany(postFilter).session(session)
			]);
			return updatedPost;
		});
		return ctx.json({ updated }, 200);
	} finally {
		await session.endSession();
	}
});
export const getPost = factory.createHandlers(validator("param", postInteractParams), async ctx => {
	const { postId } = ctx.req.valid("param");
	const originalPost = await findPostById(postId);
	if (!originalPost) {
		return ctx.text("Post not found", 404);
	}
	const post = (
		await Post.aggregate([
			{
				$match: {
					_id: new ObjectId(originalPost._id)
				}
			},
			...postAggregationPipeline((ctx.userInfo as UserInfo)?.userId)
		])
	).shift();
	return ctx.json({ post }, 200);
});
export const getPostQuotes = factory.createHandlers(validator("param", postInteractParams), validator("query", postQuotesQuery), async ctx => {
	const { req } = ctx;
	const { postId } = req.valid("param");
	const { lastQuoteId } = req.valid("query");
	const post = await findPostById(postId);
	if (!post) {
		return ctx.text("Post not found", 404);
	}
	const quotes = await Post.aggregate(postQuotesAggregationPipeline(post._id, (ctx.userInfo as UserInfo)?.userId, lastQuoteId as string));
	return ctx.json({ quotes }, 200);
});
export const getPostReplies = factory.createHandlers(validator("param", postInteractParams), validator("query", postRepliesQuery), async ctx => {
	const { req } = ctx;
	const { postId } = req.valid("param");
	const lastReplyId = req.query("lastReplyId");
	const post = await findPostById(postId);
	if (!post) {
		return ctx.text("Post not found", 404);
	}
	const replies = await Post.aggregate(postRepliesAggregationPipeline(post._id, (ctx.userInfo as UserInfo)?.userId, lastReplyId as string));
	return ctx.json({ replies }, 200);
});
export const getPostThread = factory.createHandlers(validator("param", postInteractParams), async ctx => {
	const { postId } = ctx.req.valid("param");
	const post = await findPostById(postId);
	if (!post) {
		return ctx.text("Post not found", 404);
	}
	const replies = await Post.aggregate(postThreadAggregationPipeline(post._id, post.author, (ctx.userInfo as UserInfo)?.userId));
	return ctx.json({ replies }, 200);
});
export const getPostParent = factory.createHandlers(validator("param", postInteractParams), async ctx => {
	const { postId } = ctx.req.valid("param");
	const post = await findPostById(postId);
	if (!post) {
		return ctx.text("Post not found", 404);
	}
	if (!post.replyTo) {
		return ctx.text("Post is not a reply", 422);
	}
	const parent = (await Post.aggregate(postParentAggregationPipeline(post._id, (ctx.userInfo as UserInfo)?.userId))).shift();
	return ctx.json({ parent }, 200);
});
export const quotePost = factory.createHandlers(validator("param", postInteractParams), validator("form", postCreateBody), async ctx => {
	const { req } = ctx;
	const { postId } = req.valid("param");
	const { content = emptyString, media, poll, "media-description": mediaDescription, location } = ctx.req.valid("form");
	const { userId } = ctx.userInfo as UserInfo;
	try {
		validateContent(content, poll as PollModel, media as File, postId);
	} catch (err) {
		return ctx.json(err, 400);
	}
	const session = await mongoose.startSession();
	try {
		const originalPost = await findPostById(postId);
		if (!originalPost) {
			return ctx.text("Post not found", 404);
		}
		const quote = await session.withTransaction(async () => {
			const originalPostId = originalPost._id;
			const model = {
				content,
				author: new ObjectId(userId),
				attachments: {
					...(poll && { poll }),
					...(media && {
						mediaFile: {
							fileType: getFileType((media as File).type),
							src: (await uploadFile(media as File))?.secure_url,
							description: mediaDescription
						}
					}),
					post: originalPostId
				},
				languages: originalPost.languages,
				...(location && { location }),
				mentions: [originalPost.author]
			};
			await Promise.all([updateLanguages(model), content.trim() && updateMentionsAndHashtags(content, model)]);
			const createdQuote = await new Post(model).save({ session });
			await User.findOneAndUpdate(
				{
					_id: userId
				},
				{
					$addToSet: {
						posts: createdQuote._id
					}
				}
			).session(session);
			await Post.findByIdAndUpdate(originalPostId, {
				$inc: {
					score: quoteScore
				}
			}).session(session);
			createdQuote.attachments!.post = originalPost;
			return createdQuote;
		});
		return ctx.json({ quote }, 201);
	} finally {
		await session.endSession();
	}
});
export const repeatPost = factory.createHandlers(validator("param", postInteractParams), async ctx => {
	const { postId } = ctx.req.valid("param");
	const { userId } = ctx.userInfo as UserInfo;
	const session = await mongoose.startSession();
	try {
		const originalPost = await findPostById(postId);
		if (!originalPost) {
			return ctx.text("Post not found", 404);
		}
		const originalPostId = originalPost._id;
		const payload = {
			author: userId,
			repeatPost: originalPostId
		};
		const repeated = await session.withTransaction(async () => {
			const postToDelete = await Post.findOne(payload);
			if (postToDelete) {
				await Post.findByIdAndDelete(postToDelete._id).session(session);
			}
			const createdRepeat = await new Post(payload).save({ session });
			await User.findOneAndUpdate(
				{
					_id: userId
				},
				{
					...(postToDelete
						? {
								$pull: {
									posts: null
								}
						  }
						: {}),
					$addToSet: {
						posts: createdRepeat._id
					}
				}
			).session(session);
			if (!postToDelete) {
				await Post.findByIdAndUpdate(originalPostId, {
					$inc: {
						score: repeatScore
					}
				}).session(session);
			}
			return createdRepeat;
		});
		return ctx.json({ repeated }, 201);
	} finally {
		await session.endSession();
	}
});
export const unrepeatPost = factory.createHandlers(validator("param", postInteractParams), async ctx => {
	const { postId } = ctx.req.valid("param");
	const { userId } = ctx.userInfo as UserInfo;
	const session = await mongoose.startSession();
	try {
		const unrepeated = await session.withTransaction(async () => {
			const deletedRepeat = await Post.findOneAndDelete({
				author: userId,
				repeatPost: postId
			}).session(session);
			if (deletedRepeat) {
				await User.findOneAndUpdate(
					{
						_id: userId
					},
					{
						$pull: {
							posts: deletedRepeat._id
						}
					}
				).session(session);
				await Post.findByIdAndUpdate(postId, {
					$inc: {
						score: -repeatScore
					}
				}).session(session);
			}
			return deletedRepeat;
		});
		return ctx.json({ unrepeated }, 200);
	} finally {
		await session.endSession();
	}
});
export const replyToPost = factory.createHandlers(validator("param", postInteractParams), validator("form", postCreateBody), async ctx => {
	const { req } = ctx;
	const { postId } = req.valid("param");
	const { content = emptyString, media, poll, "media-description": mediaDescription, location } = ctx.req.valid("form");
	const { userId } = ctx.userInfo as UserInfo;
	try {
		validateContent(content, poll as PollModel, media as File);
	} catch (err) {
		return ctx.json(err, 400);
	}
	const session = await mongoose.startSession();
	try {
		const originalPost = await findPostById(postId);
		if (!originalPost) {
			return ctx.text("Post not found", 404);
		}
		const reply = await session.withTransaction(async () => {
			const originalPostId = originalPost._id;
			const model = {
				content,
				author: new ObjectId(userId),
				replyTo: originalPostId,
				...((poll || media) && {
					attachments: {
						...(poll && { poll }),
						...(media && {
							mediaFile: {
								fileType: getFileType((media as File).type),
								src: (await uploadFile(media as File))?.secure_url,
								description: mediaDescription
							}
						})
					}
				}),
				...(location && { location }),
				mentions: [originalPost.author]
			};
			await Promise.all([updateLanguages(model), content.trim() && updateMentionsAndHashtags(content, model)]);
			const createdReply = await new Post(model).save({ session });
			await User.findOneAndUpdate(
				{
					_id: userId
				},
				{
					$addToSet: {
						posts: createdReply._id
					}
				}
			).session(session);
			await Post.findByIdAndUpdate(originalPostId, {
				$inc: {
					score: replyScore
				}
			}).session(session);
			return createdReply;
		});
		return ctx.json({ reply }, 201);
	} finally {
		await session.endSession();
	}
});
export const castVote = factory.createHandlers(validator("param", postInteractParams), validator("query", postVoteQuery), async ctx => {
	const { req } = ctx;
	const { postId } = req.valid("param");
	const { option } = req.valid("query");
	const { userId } = ctx.userInfo as UserInfo;
	const session = await mongoose.startSession();
	try {
		const post = await findPostById(postId);
		if (!post) {
			return ctx.text("Post not found", 404);
		}
		const poll = post.attachments?.poll as HydratedDocument<PollModel>;
		if (!poll) {
			return ctx.text("Post does not include a poll", 422);
		}
		const isOptionNota = option === "nota";
		if (!(isOptionNota || (poll as PollModel & Dictionary)[option])) {
			return ctx.text("Poll does not include the specified option", 422);
		}
		if (post.author.toString() === userId) {
			return ctx.text("User cannot vote on their own poll", 403);
		}
		const pollExpiryDate = (post as PostModel).createdAt;
		pollExpiryDate.setMilliseconds(pollExpiryDate.getMilliseconds() + poll.duration);
		if (new Date() > pollExpiryDate) {
			return ctx.text("Poll has expired", 422);
		}
		const vote = await session.withTransaction(async () => {
			const castedVote = await new Vote({
				poll: poll._id,
				user: userId,
				option
			}).save({ session });
			if (!isOptionNota) {
				await Post.findByIdAndUpdate(post._id, {
					$inc: {
						[`attachments.poll.votes.${option}`]: 1,
						score: voteScore
					}
				}).session(session);
			}
			return castedVote;
		});
		return ctx.json({ vote }, 201);
	} finally {
		await session.endSession();
	}
});
export const deletePost = factory.createHandlers(validator("param", postInteractParams), async ctx => {
	const { postId } = ctx.req.valid("param");
	const { userId } = ctx.userInfo as UserInfo;
	const session = await mongoose.startSession();
	try {
		const post = await Post.findById(postId);
		if (!post) {
			return ctx.text("Post not found", 404);
		}
		if (post.author.toString() !== userId) {
			return ctx.text("You are not allowed to perform this action", 403);
		}
		await session.withTransaction(async () => {
			const postId = post._id;
			const postFilter = { post: postId };
			const repeatedPostId = post.repeatPost;
			const repliedToPostId = post.replyTo;
			const attachments = post.attachments;
			const deleteResult = await Post.deleteOne(post as PostModel).session(session);
			if (deleteResult.deletedCount === 1) {
				if (repeatedPostId) {
					await Post.findByIdAndUpdate(repeatedPostId, {
						$inc: {
							score: -repeatScore
						}
					}).session(session);
				}
				if (repliedToPostId) {
					await Post.findByIdAndUpdate(repliedToPostId, {
						$inc: {
							score: -replyScore
						}
					}).session(session);
				}
				if (attachments) {
					const quotedPostId = attachments.post;
					const poll = attachments.poll as HydratedDocument<PollModel>;
					if (quotedPostId) {
						await Post.findByIdAndUpdate(quotedPostId, {
							$inc: {
								score: -quoteScore
							}
						}).session(session);
					}
					if (poll) {
						await Vote.deleteMany({ poll: poll._id }).session(session);
					}
				}
				await Promise.all([
					User.findOneAndUpdate(
						{
							_id: post.author
						},
						{
							$pull: {
								posts: postId
							}
						}
					).session(session),
					User.findOneAndUpdate(
						{
							pinnedPost: postId
						},
						{
							pinnedPost: undefined
						}
					).session(session),
					Post.deleteMany({
						repeatPost: postId
					}).session(session),
					Favourite.deleteMany(postFilter).session(session),
					Bookmark.deleteMany(postFilter).session(session),
					MutedPost.deleteMany(postFilter).session(session)
				]);
			}
		});
		return ctx.json({ deleted: post }, 200);
	} finally {
		await session.endSession();
	}
});