"use strict";

import { ObjectId } from "mongodb";
import type { PipelineStage } from "mongoose";

const userAggregationPipeline = (selfId?: string | ObjectId): Array<PipelineStage> => {
	const lookupStages = [];
	if (selfId) {
		const selfObjectId = new ObjectId(selfId);
		lookupStages.push(
			{
				$addFields: {
					self: {
						$cond: [
							{
								$eq: ["$_id", selfObjectId]
							},
							true,
							"$$REMOVE"
						]
					}
				}
			},
			{
				$lookup: {
					from: "blocks",
					let: {
						userId: "$_id"
					},
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$$userId", "$user"] },
								blockedBy: selfObjectId
							}
						}
					],
					as: "blockedByMe"
				}
			},
			{
				$addFields: {
					blockedByMe: {
						$cond: [
							{
								$eq: ["$blockedByMe", []]
							},
							{
								$cond: [
									{
										$eq: ["$self", true]
									},
									"$$REMOVE",
									false
								]
							},
							true
						]
					},
					blockedReason: {
						$arrayElemAt: ["$blockedByMe.reason", 0]
					}
				}
			},
			{
				$lookup: {
					from: "blocks",
					let: {
						userId: "$_id"
					},
					pipeline: [
						{
							$match: {
								user: selfObjectId,
								$expr: { $eq: ["$$userId", "$blockedBy"] }
							}
						}
					],
					as: "blockedMe"
				}
			},
			{
				$addFields: {
					blockedMe: {
						$cond: [
							{
								$eq: ["$blockedMe", []]
							},
							{
								$cond: [
									{
										$eq: ["$self", true]
									},
									"$$REMOVE",
									false
								]
							},
							true
						]
					}
				}
			},
			{
				$lookup: {
					from: "followrequests",
					let: {
						userId: "$_id"
					},
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$$userId", "$user"] },
								requestedBy: selfObjectId
							}
						}
					],
					as: "requestedToFollowByMe"
				}
			},
			{
				$addFields: {
					requestedToFollowByMe: {
						$cond: [
							{
								$eq: ["$requestedToFollowByMe", []]
							},
							{
								$cond: [
									{
										$eq: ["$self", true]
									},
									"$$REMOVE",
									false
								]
							},
							true
						]
					}
				}
			},
			{
				$lookup: {
					from: "followrequests",
					let: {
						userId: "$_id"
					},
					pipeline: [
						{
							$match: {
								user: selfObjectId,
								$expr: { $eq: ["$$userId", "$requestedBy"] }
							}
						}
					],
					as: "requestedToFollowMe"
				}
			},
			{
				$addFields: {
					requestedToFollowMe: {
						$cond: [
							{
								$eq: ["$requestedToFollowMe", []]
							},
							{
								$cond: [
									{
										$eq: ["$self", true]
									},
									"$$REMOVE",
									false
								]
							},
							true
						]
					}
				}
			},
			{
				$lookup: {
					from: "follows",
					let: {
						userId: "$_id"
					},
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$$userId", "$user"] },
								followedBy: selfObjectId
							}
						}
					],
					as: "followedByMe"
				}
			},
			{
				$addFields: {
					followedByMe: {
						$cond: [
							{
								$eq: ["$followedByMe", []]
							},
							{
								$cond: [
									{
										$eq: ["$self", true]
									},
									"$$REMOVE",
									false
								]
							},
							true
						]
					}
				}
			},
			{
				$lookup: {
					from: "follows",
					let: {
						userId: "$_id"
					},
					pipeline: [
						{
							$match: {
								user: selfObjectId,
								$expr: { $eq: ["$$userId", "$followedBy"] }
							}
						}
					],
					as: "followedMe"
				}
			},
			{
				$addFields: {
					followedMe: {
						$cond: [
							{
								$eq: ["$followedMe", []]
							},
							{
								$cond: [
									{
										$eq: ["$self", true]
									},
									"$$REMOVE",
									false
								]
							},
							true
						]
					}
				}
			},
			{
				$lookup: {
					from: "follows",
					let: {
						userId: "$_id"
					},
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$$userId", "$followedBy"] }
							}
						},
						{
							$group: {
								_id: null,
								count: {
									$sum: 1
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
						$cond: [
							{
								$eq: ["$self", true]
							},
							{
								$cond: [
									{
										$eq: ["$following", []]
									},
									0,
									{
										$arrayElemAt: ["$following.count", 0]
									}
								]
							},
							"$$REMOVE"
						]
					}
				}
			},
			{
				$lookup: {
					from: "follows",
					let: {
						userId: "$_id"
					},
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$$userId", "$user"] }
							}
						},
						{
							$group: {
								_id: null,
								count: {
									$sum: 1
								}
							}
						}
					],
					as: "followers"
				}
			},
			{
				$addFields: {
					followers: {
						$cond: [
							{
								$eq: ["$self", true]
							},
							{
								$cond: [
									{
										$eq: ["$followers", []]
									},
									0,
									{
										$arrayElemAt: ["$followers.count", 0]
									}
								]
							},
							"$$REMOVE"
						]
					}
				}
			},
			{
				$lookup: {
					from: "mutedusers",
					let: {
						userId: "$_id"
					},
					pipeline: [
						{
							$match: {
								$expr: { $eq: ["$$userId", "$user"] },
								mutedBy: selfObjectId
							}
						}
					],
					as: "mutedByMe"
				}
			},
			{
				$addFields: {
					mutedByMe: {
						$cond: [
							{
								$eq: ["$mutedByMe", []]
							},
							{
								$cond: [
									{
										$eq: ["$self", true]
									},
									"$$REMOVE",
									false
								]
							},
							true
						]
					},
					mutedReason: {
						$arrayElemAt: ["$mutedByMe.reason", 0]
					}
				}
			}
		);
	}
	return [
		{
			$project: {
				handle: 1,
				postsCount: {
					$size: "$posts"
				},
				pinnedPost: 1,
				protected: 1,
				deactivated: 1,
				following: 1,
				followers: 1
			}
		},
		...lookupStages
	];
};

export default userAggregationPipeline;