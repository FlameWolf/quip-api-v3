"use strict";

import { Error, SchemaType, SchemaTypes, type AnyObject } from "mongoose";

SchemaTypes.Point = class Point extends SchemaType {
	constructor(key: string, options: AnyObject | undefined) {
		super(key, options, "Point");
	}

	cast(value: { type: string; coordinates: Array<number> }) {
		const { type, coordinates } = value;
		const [longitude, latitude] = coordinates;
		if (!type) {
			throw new Error.CastError(this.constructor.name, value, "type");
		}
		if (!coordinates) {
			throw new Error.CastError(this.constructor.name, value, "coordinates");
		}
		if (type !== "Point") {
			throw new Error.CastError(this.constructor.name, value, "type", new NativeError(`Property "type" must be equal to "Point"`));
		}
		if (!Array.isArray(coordinates)) {
			throw new Error.CastError(this.constructor.name, value, "coordinates", new NativeError(`Property "coordinates" must be an array`));
		}
		if (coordinates.length !== 2) {
			throw new Error.CastError(this.constructor.name, value, "coordinates", new NativeError(`Property "coordinates" should contain exactly two items`));
		}
		if (typeof longitude !== "number" || typeof latitude !== "number") {
			throw new Error.CastError(this.constructor.name, value, "coordinates", new NativeError("Both coordinates must be numbers"));
		}
		if (longitude > 180 || longitude < -180) {
			throw new Error.CastError(this.constructor.name, value, "coordinates", new NativeError("Longitude must be within the range -180 to 180"));
		}
		if (latitude > 90 || latitude < -90) {
			throw new Error.CastError(this.constructor.name, value, "coordinates", new NativeError("Latitude must be within the range -90 to 90"));
		}
		return { type, coordinates };
	}
};