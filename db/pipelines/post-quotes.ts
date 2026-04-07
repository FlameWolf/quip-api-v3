"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import postAggregationPipeline from "./post.ts";
import type { PipelineStage } from "mongoose";

const postQuotesAggregationPipeline = (postId: string | ObjectId, userId?: string | ObjectId, lastQuoteId?: string | ObjectId): Array<PipelineStage> => [
	{
		$match: {
			"attachments.post": new ObjectId(postId)
		}
	},
	{
		$sort: {
			createdAt: -1
		}
	},
	{
		$match: lastQuoteId
			? {
					_id: {
						$lt: new ObjectId(lastQuoteId)
					}
				}
			: ({ $expr: true } as any)
	},
	{
		$limit: maxRowsPerFetch
	},
	...postAggregationPipeline(userId)
];

export default postQuotesAggregationPipeline;