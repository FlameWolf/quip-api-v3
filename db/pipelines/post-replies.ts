"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import filtersAggregationPipeline from "./filters.ts";
import postAggregationPipeline from "./post.ts";
import type { PipelineStage } from "mongoose";

const postRepliesAggregationPipeline = (postId: string | ObjectId, userId?: string | ObjectId, lastReplyId?: string | ObjectId): Array<PipelineStage> => [
	{
		$match: {
			replyTo: new ObjectId(postId)
		}
	},
	{
		$sort: {
			createdAt: -1
		}
	},
	...filtersAggregationPipeline(userId),
	{
		$match: lastReplyId
			? {
					_id: {
						$lt: new ObjectId(lastReplyId)
					}
				}
			: ({ $expr: true } as any)
	},
	{
		$limit: maxRowsPerFetch
	},
	...postAggregationPipeline(userId)
];

export default postRepliesAggregationPipeline;