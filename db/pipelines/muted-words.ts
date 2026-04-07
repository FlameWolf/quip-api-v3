"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import type { PipelineStage } from "mongoose";

const mutedWordsAggregationPipeline = (userId: string | ObjectId, lastMuteId?: string | ObjectId): Array<PipelineStage> => [
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
		$project: {
			word: 1,
			match: 1
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
	}
];

export default mutedWordsAggregationPipeline;