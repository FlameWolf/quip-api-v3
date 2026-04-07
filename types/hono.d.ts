import type { HonoRequest } from "hono/request";

declare module "hono" {
	declare interface HonoRequest {
		userInfo?: UserInfo;
	}
}