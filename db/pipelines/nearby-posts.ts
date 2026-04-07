"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import postAggregationPipeline from "./post.ts";
import type { PipelineStage } from "mongoose";
import type { Filter } from "mongodb";

const getPageConditions = (lastDistance?: number, lastPostId?: string | ObjectId): Filter<any> => {
	const pageConditions: Filter<any> = {};
	if (lastDistance && lastPostId) {
		pageConditions.$expr = {
			$or: [
				{
					$and: [
						{
							$eq: ["$distance", lastDistance]
						},
						{
							$lt: ["$_id", new ObjectId(lastPostId)]
						}
					]
				},
				{
					$gt: ["$distance", lastDistance]
				}
			]
		};
	}
	return pageConditions;
};
const nearbyPostsAggregationPipeline = ([longitude, latitude]: Array<number>, maxDistance: number = 5000, userId?: string | ObjectId, lastDistance?: number, lastPostId?: string | ObjectId): Array<PipelineStage> => [
	{
		$geoNear: {
			near: {
				type: "Point",
				coordinates: [longitude, latitude]
			},
			maxDistance,
			distanceField: "distance"
		}
	},
	{
		$sort: {
			distance: 1,
			createdAt: -1
		}
	},
	{
		$match: getPageConditions(lastDistance, lastPostId)
	},
	{
		$limit: maxRowsPerFetch
	},
	...postAggregationPipeline(userId)
];

export default nearbyPostsAggregationPipeline;