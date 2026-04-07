"use strict";

import { ObjectId } from "mongodb";
import type { PipelineStage } from "mongoose";

const filtersAggregationPipeline = (userId?: string | ObjectId): Array<PipelineStage> => {
	if (!userId) {
		return [];
	}
	return [
		{
			$lookup: {
				from: "users",
				pipeline: [
					{
						$match: {
							_id: new ObjectId(userId)
						}
					},
					{
						$project: {
							blockedUsers: 1,
							mutedUsers: 1,
							mutedPosts: 1,
							mutedWords: 1
						}
					}
				],
				as: "activeUser"
			}
		},
		{
			$unwind: "$activeUser"
		},
		{
			$match: {
				$expr: {
					$and: [
						{
							$not: {
								$in: ["$author", "$activeUser.blockedUsers"]
							}
						},
						{
							$not: {
								$or: [
									{
										$in: ["$author", "$activeUser.mutedUsers"]
									},
									{
										$in: ["$repeatedBy", "$activeUser.mutedUsers"]
									}
								]
							}
						},
						{
							$not: {
								$in: ["$_id", "$activeUser.mutedPosts"]
							}
						},
						{
							$eq: [
								{
									$filter: {
										input: "$activeUser.mutedWords",
										cond: {
											$regexMatch: {
												input: "$content",
												regex: "$$this",
												options: "i"
											}
										}
									}
								},
								[]
							]
						}
					]
				}
			}
		},
		{
			$unset: "activeUser"
		}
	];
};

export default filtersAggregationPipeline;