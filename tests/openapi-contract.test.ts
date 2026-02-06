import { describe, expect, it } from "bun:test";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { apiContract } from "../src/contracts";

type OpenApiSchemaRef = { $ref?: string };

type OpenApiOperation = {
  requestBody?: {
    content?: Record<string, { schema?: OpenApiSchemaRef }>;
  };
  responses?: Record<
    string,
    {
      content?: Record<string, { schema?: OpenApiSchemaRef }>;
    }
  >;
};

type OpenApiDoc = {
  paths?: Record<
    string,
    {
      get?: OpenApiOperation;
      post?: OpenApiOperation;
      delete?: OpenApiOperation;
    }
  >;
};

const getJsonResponseRef = (operation?: OpenApiOperation) =>
  operation?.responses?.["200"]?.content?.["application/json"]?.schema?.$ref;

const hasJsonResponseSchema = (operation?: OpenApiOperation) =>
  Boolean(operation?.responses?.["200"]?.content?.["application/json"]?.schema);

const getJsonRequestRef = (operation?: OpenApiOperation) =>
  operation?.requestBody?.content?.["application/json"]?.schema?.$ref;

describe("OpenAPI protocol contract", () => {
  it("matches frontend GET operation paths and response refs", () => {
    const raw = readFileSync(resolve(process.cwd(), "contracts/openapi.json"), {
      encoding: "utf-8",
    });
    const openApi = JSON.parse(raw) as OpenApiDoc;

    const entries = Object.values(apiContract.get);
    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      const operation = openApi.paths?.[entry.path]?.get;
      expect(operation).toBeTruthy();
      expect(getJsonResponseRef(operation)).toBe(entry.responseRef);
    }
  });

  it("matches frontend POST operation paths and request/response refs", () => {
    const raw = readFileSync(resolve(process.cwd(), "contracts/openapi.json"), {
      encoding: "utf-8",
    });
    const openApi = JSON.parse(raw) as OpenApiDoc;

    const entries = Object.values(apiContract.post);
    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      const operation = openApi.paths?.[entry.path]?.post;
      expect(operation).toBeTruthy();
      if ("responseRef" in entry) {
        expect(getJsonResponseRef(operation)).toBe(entry.responseRef);
      } else {
        expect(hasJsonResponseSchema(operation)).toBe(true);
      }

      if ("requestRef" in entry) {
        expect(getJsonRequestRef(operation)).toBe(entry.requestRef);
      }
    }
  });

  it("matches frontend DELETE operation paths and response refs", () => {
    const raw = readFileSync(resolve(process.cwd(), "contracts/openapi.json"), {
      encoding: "utf-8",
    });
    const openApi = JSON.parse(raw) as OpenApiDoc;

    const entries = Object.values(apiContract.delete);
    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      const operation = openApi.paths?.[entry.path]?.delete;
      expect(operation).toBeTruthy();
      expect(getJsonResponseRef(operation)).toBe(entry.responseRef);
    }
  });
});
