"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import type { PipelineStage } from "mongoose";

const mutedUsersAggregationPipeline = (userId: string | ObjectId, lastMuteId?: string | ObjectId): Array<PipelineStage> => [
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
			user: 1,
			reason: 1
		}
	}
];

export default mutedUsersAggregationPipeline;