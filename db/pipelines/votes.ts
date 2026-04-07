"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import postAggregationPipeline from "./post.ts";
import type { PipelineStage } from "mongoose";

const votesAggregationPipeline = (userId: string | ObjectId, lastVoteId?: string | ObjectId): Array<PipelineStage> => [
	{
		$match: {
			_id: new ObjectId(userId)
		}
	},
	{
		$lookup: {
			from: "votes",
			localField: "_id",
			foreignField: "user",
			pipeline: [
				{
					$sort: {
						createdAt: -1
					}
				},
				{
					$match: lastVoteId
						? {
								_id: {
									$lt: new ObjectId(lastVoteId)
								}
							}
						: ({ $expr: true } as any)
				},
				{
					$lookup: {
						from: "posts",
						foreignField: "attachments.poll._id",
						localField: "poll",
						as: "post"
					}
				},
				{
					$unwind: "$post"
				},
				{
					$limit: maxRowsPerFetch
				}
			],
			as: "votes"
		}
	},
	{
		$unwind: "$votes"
	},
	{
		$replaceRoot: {
			newRoot: "$votes.post"
		}
	},
	...postAggregationPipeline(userId)
];

export default votesAggregationPipeline;