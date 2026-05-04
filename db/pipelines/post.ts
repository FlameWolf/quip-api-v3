"use strict";

import { ObjectId } from "mongodb";
import interactionsAggregationPipeline from "./interactions.ts";
import type { PipelineStage } from "mongoose";

const authorLookupAndUnwind: Array<PipelineStage> = [
	{
		$lookup: {
			from: "users",
			localField: "author",
			foreignField: "_id",
			pipeline: [
				{
					$project: {
						handle: {
							$cond: ["$deleted", "[deleted]", "$handle"]
						}
					}
				}
			],
			as: "author"
		}
	},
	{
		$unwind: "$author"
	},
	{
		$lookup: {
			from: "users",
			localField: "repeatedBy",
			foreignField: "_id",
			pipeline: [
				{
					$project: {
						handle: {
							$cond: ["$deleted", "[deleted]", "$handle"]
						}
					}
				}
			],
			as: "repeatedBy"
		}
	},
	{
		$unwind: {
			path: "$repeatedBy",
			preserveNullAndEmptyArrays: true
		}
	}
];
const postAggregationPipeline = (userId?: string | ObjectId): Array<PipelineStage> => {
	return [
		...(authorLookupAndUnwind as Array<any>),
		{
			$lookup: {
				from: "posts",
				localField: "attachments.post",
				foreignField: "_id",
				pipeline: authorLookupAndUnwind,
				as: "quotedPost"
			}
		},
		{
			$unwind: {
				path: "$quotedPost",
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$set: {
				"attachments.post": {
					$ifNull: ["$quotedPost", "$attachments.post"]
				}
			}
		},
		{
			$unset: "quotedPost"
		},
		{
			$addFields: {
				attachments: {
					$cond: [
						{
							$ne: ["$attachments", {}]
						},
						{
							$mergeObjects: [
								"$attachments",
								{
									poll: {
										$cond: [
											{
												$gt: ["$attachments.poll", null]
											},
											{
												$mergeObjects: [
													"$attachments.poll",
													{
														expired: {
															$gt: [
																new Date(),
																{
																	$add: ["$createdAt", "$attachments.poll.duration"]
																}
															]
														}
													}
												]
											},
											"$$REMOVE"
										]
									}
								}
							]
						},
						"$$REMOVE"
					]
				}
			}
		},
		...interactionsAggregationPipeline(userId)
	];
};

export default postAggregationPipeline;