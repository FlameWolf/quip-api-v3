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