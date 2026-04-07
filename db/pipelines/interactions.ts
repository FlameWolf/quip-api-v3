"use strict";

import { ObjectId } from "mongodb";
import type { PipelineStage } from "mongoose";

const interactionsAggregationPipeline = (userId?: string | ObjectId): Array<PipelineStage> => {
	if (!userId) {
		return [];
	}
	const userObjectId = new ObjectId(userId);
	return [
		{
			$lookup: {
				from: "favourites",
				localField: "_id",
				foreignField: "post",
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ["$favouritedBy", userObjectId]
							}
						}
					},
					{
						$addFields: {
							result: true
						}
					}
				],
				as: "favourited"
			}
		},
		{
			$addFields: {
				favourited: {
					$arrayElemAt: ["$favourited.result", 0]
				}
			}
		},
		{
			$lookup: {
				from: "posts",
				localField: "_id",
				foreignField: "repeatPost",
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ["$author", userObjectId]
							}
						}
					},
					{
						$addFields: {
							result: true
						}
					}
				],
				as: "repeated"
			}
		},
		{
			$addFields: {
				repeated: {
					$arrayElemAt: ["$repeated.result", 0]
				}
			}
		},
		{
			$lookup: {
				from: "votes",
				localField: "attachments.poll._id",
				foreignField: "poll",
				pipeline: [
					{
						$match: {
							$expr: {
								$eq: ["$user", userObjectId]
							}
						}
					},
					{
						$project: {
							option: 1
						}
					}
				],
				as: "voted"
			}
		},
		{
			$addFields: {
				voted: {
					$arrayElemAt: ["$voted.option", 0]
				}
			}
		}
	];
};

export default interactionsAggregationPipeline;