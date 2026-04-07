"use strict";

declare module "bson" {
	declare class ObjectId {
		constructor(param: any = undefined) {
			return param ? new ObjectId() : ObjectId.createFromHexString(param);
		}
	}
}