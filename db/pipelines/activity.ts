"use strict";

import { ObjectId } from "mongodb";
import { emptyString, maxRowsPerFetch } from "../../library.ts";
import filtersAggregationPipeline from "./filters.ts";
import postAggregationPipeline from "./post.ts";
import type { PipelineStage } from "mongoose";

const activityAggregationPipeline = (userId: string | ObjectId, period: string = emptyString, lastEntryId?: string | ObjectId): Array<PipelineStage> => {
	const maxDate = new Date();
	switch (period.toLowerCase()) {
		case "month":
			maxDate.setMonth(maxDate.getMonth() - 1);
			break;
		case "week":
			maxDate.setDate(maxDate.getDate() - 7);
			break;
		case "day":
		default:
			maxDate.setDate(maxDate.getDate() - 1);
			break;
	}
	return [
		{
			$match: {
				_id: new ObjectId(userId)
			}
		},
		{
			$lookup: {
				from: "follows",
				localField: "_id",
				foreignField: "followedBy",
				pipeline: [
					{
						$lookup: {
							from: "users",
							localField: "user",
							foreignField: "_id",
							pipeline: [
								{
									$match: {
										deactivated: false,
										deleted: false
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
						$group: {
							_id: undefined,
							result: {
								$addToSet: "$user"
							}
						}
					}
				],
				as: "following"
			}
		},
		{
			$addFields: {
				following: {
					$ifNull: [
						{
							$arrayElemAt: ["$following.result", 0]
						},
						[]
					]
				}
			}
		},
		{
			$lookup: {
				from: "favourites",
				localField: "following",
				foreignField: "favouritedBy",
				pipeline: [
					{
						$match: {
							createdAt: {
								$gte: maxDate
							}
						}
					},
					{
						$lookup: {
							from: "posts",
							localField: "post",
							foreignField: "_id",
							as: "post"
						}
					},
					{
						$unwind: "$post"
					},
					{
						$group: {
							_id: "$post",
							latestId: {
								$max: "$_id"
							},
							favouritedBy: {
								$addToSet: "$favouritedBy"
							},
							createdAt: {
								$max: "$createdAt"
							}
						}
					},
					{
						$project: {
							_id: "$latestId",
							post: "$_id",
							favouritedBy: {
								$size: "$favouritedBy"
							},
							createdAt: 1
						}
					}
				],
				as: "favourited"
			}
		},
		{
			$lookup: {
				from: "posts",
				localField: "following",
				foreignField: "author",
				pipeline: [
					{
						$match: {
							createdAt: {
								$gte: maxDate
							}
						}
					},
					{
						$group: {
							_id: "$attachments.post",
							latestId: {
								$max: "$_id"
							},
							quotedBy: {
								$addToSet: "$author"
							},
							createdAt: {
								$max: "$createdAt"
							}
						}
					},
					{
						$project: {
							_id: "$latestId",
							post: "$_id",
							quotedBy: {
								$size: "$quotedBy"
							},
							createdAt: 1
						}
					}
				],
				as: "quoted"
			}
		},
		{
			$lookup: {
				from: "votes",
				localField: "following",
				foreignField: "user",
				pipeline: [
					{
						$match: {
							createdAt: {
								$gte: maxDate
							}
						}
					},
					{
						$group: {
							_id: "$poll",
							latestId: {
								$max: "$_id"
							},
							votedBy: {
								$addToSet: "$user"
							},
							createdAt: {
								$max: "$createdAt"
							}
						}
					},
					{
						$lookup: {
							from: "posts",
							localField: "_id",
							foreignField: "attachments.poll._id",
							as: "post"
						}
					},
					{
						$unwind: "$post"
					},
					{
						$project: {
							_id: "$latestId",
							post: "$post",
							votedBy: {
								$size: "$votedBy"
							},
							createdAt: 1
						}
					}
				],
				as: "voted"
			}
		},
		{
			$lookup: {
				from: "posts",
				localField: "following",
				foreignField: "author",
				pipeline: [
					{
						$match: {
							createdAt: {
								$gte: maxDate
							}
						}
					},
					{
						$lookup: {
							from: "posts",
							localField: "replyTo",
							foreignField: "_id",
							as: "replyTo"
						}
					},
					{
						$unwind: "$replyTo"
					},
					{
						$group: {
							_id: "$replyTo",
							latestId: {
								$max: "$_id"
							},
							repliedBy: {
								$addToSet: "$author"
							},
							createdAt: {
								$max: "$createdAt"
							}
						}
					},
					{
						$project: {
							_id: "$latestId",
							post: "$_id",
							repliedBy: {
								$size: "$repliedBy"
							},
							createdAt: 1
						}
					}
				],
				as: "replied"
			}
		},
		{
			$lookup: {
				from: "follows",
				localField: "following",
				foreignField: "followedBy",
				pipeline: [
					{
						$match: {
							createdAt: {
								$gte: maxDate
							}
						}
					},
					{
						$group: {
							_id: "$user",
							latestId: {
								$max: "$_id"
							},
							followedBy: {
								$addToSet: "$followedBy"
							}
						}
					},
					{
						$project: {
							_id: "$latestId",
							user: "$_id",
							followedBy: {
								$size: "$followedBy"
							}
						}
					}
				],
				as: "followed"
			}
		},
		{
			$project: {
				entry: {
					$concatArrays: ["$favourited", "$quoted", "$voted", "$replied", "$followed"]
				}
			}
		},
		{
			$unset: ["favourited", "quoted", "voted", "replied", "followed"]
		},
		{
			$unwind: "$entry"
		},
		{
			$lookup: {
				from: "posts",
				localField: "entry.post._id",
				foreignField: "_id",
				pipeline: filtersAggregationPipeline(userId).concat(postAggregationPipeline(userId)) as Array<any>,
				as: "entry.post"
			}
		},
		{
			$unwind: {
				path: "$entry.post",
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$sort: {
				"entry.createdAt": -1
			}
		},
		{
			$match: lastEntryId
				? {
						"entry._id": {
							$lt: new ObjectId(lastEntryId)
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
				localField: "entry.user",
				foreignField: "_id",
				pipeline: [
					{
						$project: {
							handle: 1
						}
					}
				],
				as: "entry.user"
			}
		},
		{
			$unwind: {
				path: "$entry.user",
				preserveNullAndEmptyArrays: true
			}
		},
		{
			$replaceRoot: {
				newRoot: "$entry"
			}
		}
	];
};

export default activityAggregationPipeline;