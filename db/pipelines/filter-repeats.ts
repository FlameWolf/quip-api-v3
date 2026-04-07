"use strict";

import type { PipelineStage } from "mongoose";

const filterRepeatsAggregationPipeline = (includeRepeats: boolean): Array<PipelineStage> => {
	if (!includeRepeats) {
		return [];
	}
	return [
		{
			$lookup: {
				from: "posts",
				localField: "repeatPost",
				foreignField: "_id",
				let: {
					repeatedBy: "$author"
				},
				pipeline: [
					{
						$addFields: {
							repeatedBy: "$$repeatedBy"
						}
					}
				],
				as: "repeatedPost"
			}
		},
		{
			$unwind: {
				path: "$repeatedPost",
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$replaceRoot: {
				newRoot: {
					$ifNull: ["$repeatedPost", "$$ROOT"]
				}
			}
		}
	];
};

export default filterRepeatsAggregationPipeline;