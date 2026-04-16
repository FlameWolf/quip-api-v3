"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import postAggregationPipeline from "./post.ts";
import type { PipelineStage } from "mongoose";

const postThreadAggregationPipeline = (postId: string | ObjectId, authorId: string | ObjectId, userId?: string | ObjectId, lastReplyId?: string | ObjectId): Array<PipelineStage> => [
	{
		$match: {
			_id: new ObjectId(postId)
		}
	},
	{
		$graphLookup: {
			from: "posts",
			startWith: "$_id",
			connectFromField: "_id",
			connectToField: "replyTo",
			maxDepth: maxRowsPerFetch,
			restrictSearchWithMatch: {
				author: new ObjectId(authorId)
			},
			as: "replies"
		}
	},
	{
		$unwind: "$replies"
	},
	{
		$replaceWith: "$replies"
	},
	{
		$sort: {
			createdAt: 1
		}
	},
	...postAggregationPipeline(userId)
];

export default postThreadAggregationPipeline;