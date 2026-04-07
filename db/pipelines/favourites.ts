"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import postAggregationPipeline from "./post.ts";
import type { PipelineStage } from "mongoose";

const favouritesAggregationPipeline = (userId: string | ObjectId, lastFavouriteId?: string | ObjectId): Array<PipelineStage> => [
	{
		$match: {
			_id: new ObjectId(userId)
		}
	},
	{
		$lookup: {
			from: "favourites",
			localField: "_id",
			foreignField: "favouritedBy",
			pipeline: [
				{
					$sort: {
						createdAt: -1
					}
				},
				{
					$match: lastFavouriteId
						? {
								_id: {
									$lt: new ObjectId(lastFavouriteId)
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
			],
			as: "favourites"
		}
	},
	{
		$unwind: "$favourites"
	},
	{
		$replaceRoot: {
			newRoot: "$favourites"
		}
	}
];

export default favouritesAggregationPipeline;