"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import userAggregationPipeline from "./user.ts";
import type { PipelineStage } from "mongoose";

const followersAggregationPipeline = (userId: string | ObjectId, lastFollowId?: string | ObjectId): Array<PipelineStage> => [
	{
		$match: {
			user: new ObjectId(userId)
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
			localField: "followedBy",
			foreignField: "_id",
			pipeline: userAggregationPipeline(userId) as Array<Exclude<PipelineStage, PipelineStage.Merge | PipelineStage.Out>>,
			as: "followedBy"
		}
	},
	{
		$unwind: "$followedBy"
	},
	{
		$project: {
			followedBy: 1
		}
	}
];

export default followersAggregationPipeline;