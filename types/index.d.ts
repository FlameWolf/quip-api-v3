"use strict";

import { ObjectId } from "mongodb";

declare global {
	type DeepPartial<T> = T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } : T;
	type DeepRequired<T> = T extends object ? { [P in keyof T]-?: DeepRequired<T[P]> } : T;
	type Dictionary<T = any> = {
		[key: string | symbol]: T;
	};
	type InferArrayElementType<T> = T extends readonly (infer ElementType)[] ? ElementType : never;
	type UserInfo = {
		handle: string;
		userId: string;
	};
}