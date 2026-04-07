"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import userAggregationPipeline from "./user.ts";
import type { PipelineStage } from "mongoose";

const followingAggregationPipeline = (userId: string | ObjectId, lastFollowId?: string | ObjectId): Array<PipelineStage> => [
	{
		$match: {
			followedBy: new ObjectId(userId)
		}
	},
	{
		$sort: {
			createdAt: -1
		}
	},
	{
		$match: lastFollowId
			? {
					_id: {
						$lt: new ObjectId(lastFollowId)
					}
				}
			: ({ $expr: true } as any)
	},
	{
		$limit: maxRowsPerFetch
	},
	{
		$lookup: {
			from: "users",
			localField: "user",
			foreignField: "_id",
			pipeline: userAggregationPipeline(userId) as Array<Exclude<PipelineStage, PipelineStage.Merge | PipelineStage.Out>>,
			as: "user"
		}
	},
	{
		$unwind: "$user"
	},
	{
		$project: {
			user: 1
		}
	}
];

export default followingAggregationPipeline;