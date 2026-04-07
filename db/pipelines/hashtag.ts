"use strict";

import { ObjectId } from "mongodb";
import { maxRowsPerFetch } from "../../library.ts";
import postAggregationPipeline from "./post.ts";
import type { PipelineStage } from "mongoose";
import type { Filter } from "mongodb";

const getPageConditions = (sortByDate: boolean, lastScore?: number, lastPostId?: string | ObjectId): Filter<any> | undefined => {
	if (lastPostId) {
		const lastPostObjectId = new ObjectId(lastPostId);
		if (sortByDate) {
			return {
				lastPostId: {
					$lt: lastPostObjectId
				}
			};
		}
		if (lastScore) {
			return {
				$expr: {
					$or: [
						{
							$and: [
								{
									$eq: ["$score", lastScore]
								},
								{
									$lt: ["$_id", lastPostObjectId]
								}
							]
						},
						{
							$lt: ["$score", lastScore]
						}
					]
				}
			};
		}
	}
	return {};
};
const hashtagAggregationPipeline = (hashtag: string, userId?: string | ObjectId, sortBy: string = "date", lastScore?: number, lastPostId?: string | ObjectId): Array<PipelineStage> => {
	const sortByDate = sortBy !== "popular";
	return [
		{
			$match: {
				hashtags: hashtag
			}
		},
		{
			$sort: sortByDate
				? {
						createdAt: -1,
						score: -1
					}
				: {
						score: -1,
						createdAt: -1
					}
		},
		{
			$match: getPageConditions(sortByDate, lastScore, lastPostId) as Filter<any>
		},
		{
			$limit: maxRowsPerFetch
		},
		...postAggregationPipeline(userId)
	];
};

export default hashtagAggregationPipeline;