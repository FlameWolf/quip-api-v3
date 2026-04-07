"use strict";

import { ObjectId } from "mongodb";
import { emptyString, maxRowsPerFetch } from "../../library.ts";
import postAggregationPipeline from "./post.ts";
import type { PipelineStage } from "mongoose";
import type { Filter } from "mongodb";

const getMatchConditions = (searchText: string, searchOptions: { from?: string; since?: string; until?: string; hasMedia?: boolean; notFrom?: string; replies?: string; languages?: string; includeLanguages?: string; mediaDescription?: string }): Filter<any> => {
	const separator = "|";
	const atSign = "@";
	const matchConditions: Filter<any> = {
		$expr: {}
	};
	if (searchText) {
		matchConditions.$text = { $search: searchText, $language: "none" };
	}
	const { from, since, until, hasMedia, notFrom, replies, languages, includeLanguages, mediaDescription } = searchOptions;
	if (from) {
		if (from.indexOf(separator) > -1) {
			matchConditions.$expr!.$in = ["$author.handle", from.split(separator).map((x: string) => x.replace(atSign, emptyString))];
		} else {
			matchConditions.$expr!.$eq = ["$author.handle", from.replace(atSign, emptyString)];
		}
	}
	if (since) {
		matchConditions.createdAt = { $gte: new Date(since) };
	}
	if (until) {
		matchConditions.createdAt = { $lte: new Date(until) };
	}
	if (hasMedia) {
		matchConditions.$expr!.$gt = ["$attachments.mediaFile", null];
	}
	if (notFrom) {
		if (notFrom.indexOf(separator) > -1) {
			matchConditions.$expr!.$not = { $in: ["$author.handle", notFrom.split(separator).map((x: string) => x.replace(atSign, emptyString))] };
		} else {
			matchConditions.$expr!.$not = { $eq: ["$author.handle", notFrom.replace(atSign, emptyString)] };
		}
	}
	switch (replies) {
		case "exclude":
			matchConditions.replyTo = { $exists: false };
			break;
		case "only":
			matchConditions.replyTo = { $exists: true };
			break;
		default:
			break;
	}
	if (languages) {
		if (languages.indexOf(separator) > -1) {
			const languageArray = languages.split(separator);
			matchConditions.languages = { $exists: true };
			matchConditions.$expr!.$setIsSubset = includeLanguages === "all" ? [languageArray, "$languages"] : ["$languages", languageArray];
		} else {
			matchConditions.languages = languages;
		}
	}
	if (mediaDescription) {
		matchConditions.attachments = {
			mediaFile: {
				description: new RegExp(mediaDescription.replace(/\s+/g, ".*?\\s+.*?"), "i")
			}
		};
	}
	return matchConditions;
};
const addScoreField = (searchText: string, sortBy: string): Array<PipelineStage> => {
	if (searchText && sortBy !== "popular") {
		return [
			{
				$addFields: {
					score: {
						$meta: "textScore"
					}
				}
			}
		];
	}
	return [];
};
const getSortConditions = (sortByDate: boolean, dateSort: number): Record<string, any> =>
	sortByDate
		? {
				createdAt: dateSort,
				score: -1
			}
		: {
				score: -1,
				createdAt: dateSort
			};
const getPageConditions = (sortByDate: boolean, idCompare: string, lastScore?: number, lastPostId?: string | ObjectId): Filter<any> => {
	const pageConditions: Filter<any> = {};
	if (lastPostId) {
		const lastPostObjectId = new ObjectId(lastPostId);
		if (sortByDate) {
			pageConditions._id[idCompare] = lastPostObjectId;
		} else if (lastScore) {
			pageConditions.$expr = {
				$or: [
					{
						$and: [
							{
								$eq: ["$score", lastScore]
							},
							{
								[idCompare]: ["$_id", lastPostObjectId]
							}
						]
					},
					{
						$lt: ["$score", lastScore]
					}
				]
			};
		}
	}
	return pageConditions;
};
const searchPostsAggregationPipeline = (searchText: string = emptyString, searchOptions: Dictionary = {}, sortBy: string = "match", dateOrder: string = "desc", userId?: string | ObjectId, lastScore?: number, lastPostId?: string | ObjectId): Array<PipelineStage> => {
	const sortByDate = sortBy === "date";
	const [dateSort, idCompare] = dateOrder === "asc" ? [1, "$gt"] : [-1, "$lt"];
	return [
		{
			$match: getMatchConditions(searchText, searchOptions)
		},
		...addScoreField(searchText, sortBy),
		{
			$sort: getSortConditions(sortByDate, dateSort)
		},
		{
			$match: getPageConditions(sortByDate, idCompare, lastScore, lastPostId)
		},
		{
			$limit: maxRowsPerFetch
		},
		...postAggregationPipeline(userId)
	];
};

export default searchPostsAggregationPipeline;