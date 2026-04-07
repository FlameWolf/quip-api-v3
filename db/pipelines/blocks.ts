"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import type { PipelineStage } from "mongoose";

const blocksAggregationPipeline = (userId: string | ObjectId, lastBlockId?: string | ObjectId): Array<PipelineStage> => [
	{
		$match: {
			blockedBy: new ObjectId(userId)
		}
	},
	{
		$sort: {
			createdAt: -1
		}
	},
	{
		$match: lastBlockId
			? {
					_id: {
						$lt: new ObjectId(lastBlockId)
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

export default blocksAggregationPipeline;