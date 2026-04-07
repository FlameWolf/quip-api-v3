"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import type { PipelineStage } from "mongoose";

const followRequestsSentAggregationPipeline = (userId: string | ObjectId, lastFollowRequestId?: string | ObjectId): Array<PipelineStage> => [
	{
		$match: {
			requestedBy: new ObjectId(userId)
		}
	},
	{
		$sort: {
			createdAt: -1
		}
	},
	{
		$match: lastFollowRequestId
			? {
					_id: {
						$lt: new ObjectId(lastFollowRequestId)
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
			pipeline: [
				{
					$project: {
						handle: 1
					}
				}
			],
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

export default followRequestsSentAggregationPipeline;