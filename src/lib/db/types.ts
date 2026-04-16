import { customType } from "drizzle-orm/pg-core";

export const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

export const point = customType<{ data: [number, number] }>({
  dataType() {
    return "geometry(Point, 4326)";
  },
  toDriver(value: [number, number]) {
    return `SRID=4326;POINT(${value[0]} ${value[1]})`;
  },
  fromDriver(value: unknown) {
    return value as [number, number];
  },
});
