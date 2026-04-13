import type { HonoRequest } from "hono/request";

declare module "hono" {
	declare interface Context {
		userInfo?: UserInfo;
	}
}