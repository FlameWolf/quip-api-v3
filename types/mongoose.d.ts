"use strict";

import mongoose, { Schema, SchemaType } from "mongoose";

declare module "mongoose" {
	declare namespace Schema {
		declare namespace Types {
			class Point extends SchemaType {}
			class Url extends SchemaType {}
		}
	}
}