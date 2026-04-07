import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { openAPIRouteHandler } from "hono-openapi";
import { swaggerUI } from "@hono/swagger-ui";
import { emptyString } from "./library.ts";
import jwt from "jsonwebtoken";

const isProdEnv = process.env.NODE_ENV === "production";
if (!isProdEnv) {
	(await import("dotenv")).config();
}
await import("./schemaTypes/point.ts");
await import("./schemaTypes/url.ts");
(await import("mongoose"))
	.connect(process.env.DB_CONNECTION as string)
	.then(() => {
		console.log("Connected to the database");
	})
	.catch(() => {
		console.log("Unable to connect to the database");
	});
(await import("cloudinary")).v2.config({
	cloud_name: process.env.CLOUD_BUCKET,
	api_key: process.env.CLOUD_API_KEY,
	api_secret: process.env.CLOUD_API_SECRET
});

const allowedOrigins = process.env.ALLOW_ORIGINS || emptyString;
const app = new Hono();
app.use(secureHeaders());
app.use(async (ctx, next) => {
	const { req, res } = ctx;
	const origin = req.header("Origin") || emptyString;
	res.headers.set("Access-Control-Allow-Origin", (allowedOrigins.indexOf(`${origin};`) > -1 && origin) || "*");
	res.headers.set("Access-Control-Allow-Credentials", "true");
	res.headers.set("Access-Control-Allow-Headers", "Authorization, Origin, X-Requested-With, Content-Type, Accept, X-Slug, X-UID");
	res.headers.set("Access-Control-Allow-Methods", "OPTIONS, POST, PUT, PATCH, GET, DELETE");
	if (req.method === "OPTIONS") {
		return ctx.status(200);
	}
	await next();
});
app.use(async ({ req }, next) => {
	try {
		const authToken = req.header("Authorization")?.replace(/^bearer\s+/i, emptyString);
		req.userInfo = (authToken && jwt.verify(authToken, process.env.JWT_AUTH_SECRET as string)) as UserInfo;
	} catch {}
	await next();
});
(await import("./routes/index.router.ts")).default(app);
(await import("./routes/auth.router.ts")).default(app.basePath("/auth"));
(await import("./routes/users.router.ts")).default(app.basePath("/users"));
(await import("./routes/lists.router.ts")).default(app.basePath("/lists"));
(await import("./routes/posts.router.ts")).default(app.basePath("/posts"));
(await import("./routes/search.router.ts")).default(app.basePath("/search"));
(await import("./routes/settings.router.ts")).default(app.basePath("/settings"));
app.get(
	"/openapi",
	openAPIRouteHandler(app, {
		documentation: {
			info: {
				title: "Quip API",
				version: "1.0.0"
			},
			components: {
				securitySchemes: {
					Bearer: {
						type: "apiKey",
						name: "Authorization",
						in: "header",
						description: "Enter your bearer token in the format **Bearer &#x3C;token&#x3E;**"
					}
				}
			},
			security: [
				{
					Bearer: []
				}
			],
			servers: [{ url: "http://localhost:2048", description: "Local Server" }]
		}
	})
);
app.get(
	"/swagger",
	swaggerUI({
		url: "/openapi",
		persistAuthorization: true,
		withCredentials: true
	})
);
serve(
	{
		fetch: app.fetch,
		port: +(process.env.PORT as string) || 2048
	},
	info => {
		console.log(`Server is running on http://localhost:${info.port}`);
	}
);