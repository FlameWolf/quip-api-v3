"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import postAggregationPipeline from "./post.ts";
import type { PipelineStage } from "mongoose";

const mutedPostsAggregationPipeline = (userId: string | ObjectId, lastMuteId?: string | ObjectId): Array<PipelineStage> => [
	{
		$match: {
			mutedBy: new ObjectId(userId)
		}
	},
	{
		$sort: {
			createdAt: -1
		}
	},
	{
		$match: lastMuteId
			? {
					_id: {
						$lt: new ObjectId(lastMuteId)
					}
				}
			: ({ $expr: true } as any)
	},
	{
		$limit: maxRowsPerFetch
	},
	{
		$lookup: {
			from: "posts",
			localField: "post",
			foreignField: "_id",
			pipeline: postAggregationPipeline(userId) as Array<any>,
			as: "post"
		}
	},
	{
		$unwind: "$post"
	},
	{
		$project: {
			post: 1
		}
	}
];

export default mutedPostsAggregationPipeline;