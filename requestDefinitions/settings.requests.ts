"use strict";

import { type } from "arktype";

export const settingBody = type("Record<string, unknown>");
export const wordMuteBody = type({
	word: "string",
	match: type.enumerated("exact", "contains", "startsWith", "endsWith").optional()
});
export const requestApprovalParams = type({
	requestId: "string"
});
export const followRequestsBody = type({
	requestIds: "string[]"
});
export const blockedUsersQuery = type({
	lastBlockId: "string?"
});
export const mutedItemsQuery = type({
	lastMuteId: "string?"
});
export const updateEmailBody = type({
	email: "string"
});
export const changePasswordBody = type({
	oldPassword: "string",
	newPassword: "string"
});
export const settingInteractParams = type({
	path: "string"
});
export const updateSettingQuery = type({
	value: "string"
});

export type SettingBody = typeof settingBody.inferOut;
export type WordMuteBody = typeof wordMuteBody.inferOut;
export type RequestApprovalParams = typeof requestApprovalParams.inferOut;
export type FollowRequestsBody = typeof followRequestsBody.inferOut;
export type BlockedUsersQuery = typeof blockedUsersQuery.inferOut;
export type MutedItemsQuery = typeof mutedItemsQuery.inferOut;
export type UpdateEmailBody = typeof updateEmailBody.inferOut;
export type ChangePasswordBody = typeof changePasswordBody.inferOut;
export type SettingInteractParams = typeof settingInteractParams.inferOut;
export type UpdateSettingQuery = typeof updateSettingQuery.inferOut;