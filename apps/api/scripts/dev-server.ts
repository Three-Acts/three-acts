import { createServer } from "node:http";
import type { IncomingMessage, ServerResponse } from "node:http";
import { URL } from "node:url";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const port = Number(process.env.PORT ?? 5175);
const host = process.env.HOST ?? "0.0.0.0";

type RouteLoader = () => Promise<{ default: (request: VercelRequest, response: VercelResponse) => unknown }>;

// Vercel resolves each of these to a file under api/ by exact path, with
// `[param]` segments (e.g. `[collectionId]`) matching any single path segment
// and landing in `request.query`. This map stays explicit (no fs scanning) so
// `tsx` can statically resolve every dynamic import below.
const routes = {
  "/api/health": () => import("../api/health"),
  "/api/meta": () => import("../api/meta"),
  "/api/deploy": () => import("../api/deploy"),
  "/api/deploy-status": () => import("../api/deploy-status"),
  "/api/contact": () => import("../api/contact"),
  "/api/cms/collections": () => import("../api/cms/collections"),
  "/api/cms/collections/[collectionId]/records": () => import("../api/cms/collections/[collectionId]/records"),
  "/api/cms/collections/[collectionId]/records/[recordId]": () =>
    import("../api/cms/collections/[collectionId]/records/[recordId]"),
  "/api/cms/collections/[collectionId]/import": () => import("../api/cms/collections/[collectionId]/import"),
  "/api/cms/collections/[collectionId]/assets/[fieldKey]": () =>
    import("../api/cms/collections/[collectionId]/assets/[fieldKey]"),
  "/api/cms/collections/[collectionId]/status": () => import("../api/cms/collections/[collectionId]/status"),
  "/api/cms/publish": () => import("../api/cms/publish"),
  "/api/content/collections/[collectionId]/records": () => import("../api/content/collections/[collectionId]/records")
} satisfies Record<string, RouteLoader>;

type CompiledRoute = {
  regex: RegExp;
  paramNames: string[];
  load: RouteLoader;
};

const dynamicSegment = /^\[(.+)\]$/;

/** Turns a route pattern like `/api/cms/collections/[collectionId]/records` into a matcher + its param names. */
function compileRoute(pattern: string, load: RouteLoader): CompiledRoute {
  const paramNames: string[] = [];

  const regexSegments = pattern
    .split("/")
    .filter(Boolean)
    .map((segment) => {
      const dynamicMatch = segment.match(dynamicSegment);
      if (dynamicMatch) {
        paramNames.push(dynamicMatch[1]);
        return "([^/]+)";
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    });

  return {
    regex: new RegExp(`^/${regexSegments.join("/")}/?$`),
    paramNames,
    load
  };
}

const compiledRoutes = Object.entries(routes).map(([pattern, load]) => compileRoute(pattern, load));

/** First matching route for `pathname`, plus the dynamic segment values extracted from it. */
function matchRoute(pathname: string): { load: RouteLoader; params: Record<string, string> } | undefined {
  for (const route of compiledRoutes) {
    const match = route.regex.exec(pathname);
    if (!match) {
      continue;
    }

    const params: Record<string, string> = {};
    route.paramNames.forEach((name, index) => {
      params[name] = decodeURIComponent(match[index + 1]);
    });

    return { load: route.load, params };
  }

  return undefined;
}

const readBody = async (request: IncomingMessage) => {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const rawBody = Buffer.concat(chunks).toString("utf8");

  if (!rawBody) {
    return undefined;
  }

  if (request.headers["content-type"]?.includes("application/json")) {
    return JSON.parse(rawBody) as unknown;
  }

  return rawBody;
};

/**
 * `URLSearchParams` -> query object, keeping repeated keys as arrays the way
 * Vercel's own request.query does (`Object.fromEntries` would silently drop
 * all but the last value for a repeated key).
 */
const buildQuery = (searchParams: URLSearchParams): Record<string, string | string[]> => {
  const query: Record<string, string | string[]> = {};

  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    query[key] = values.length > 1 ? values : values[0];
  }

  return query;
};

const createVercelResponse = (response: ServerResponse) => {
  const vercelResponse = {
    status(statusCode: number) {
      response.statusCode = statusCode;
      return vercelResponse;
    },
    setHeader(name: string, value: number | string | readonly string[]) {
      response.setHeader(name, value);
      return vercelResponse;
    },
    json(body: unknown) {
      if (!response.hasHeader("Content-Type")) {
        response.setHeader("Content-Type", "application/json; charset=utf-8");
      }

      response.end(JSON.stringify(body));
      return vercelResponse;
    },
    end(body?: string) {
      response.end(body);
      return vercelResponse;
    }
  };

  return vercelResponse as unknown as VercelResponse;
};

const server = createServer(async (incomingRequest, outgoingResponse) => {
  const requestUrl = new URL(
    incomingRequest.url ?? "/",
    `http://${incomingRequest.headers.host ?? `${host}:${port}`}`
  );
  const matched = matchRoute(requestUrl.pathname);

  if (!matched) {
    outgoingResponse.statusCode = 404;
    outgoingResponse.setHeader("Content-Type", "application/json; charset=utf-8");
    outgoingResponse.end(
      JSON.stringify({
        ok: false,
        error: {
          code: "not_found",
          message: "API route not found."
        }
      })
    );
    return;
  }

  try {
    const body = await readBody(incomingRequest);
    const request = {
      ...incomingRequest,
      body,
      headers: incomingRequest.headers,
      method: incomingRequest.method,
      // Route params (e.g. collectionId from `[collectionId]`) win over a
      // same-named search param, matching Vercel's own dynamic-route query.
      query: { ...buildQuery(requestUrl.searchParams), ...matched.params },
      url: incomingRequest.url,
      cookies: {}
    } as unknown as VercelRequest;
    const response = createVercelResponse(outgoingResponse);
    const route = await matched.load();

    await route.default(request, response);
  } catch (caughtError) {
    if (outgoingResponse.headersSent) {
      console.error(caughtError);
      return;
    }

    outgoingResponse.setHeader("Content-Type", "application/json; charset=utf-8");

    if (caughtError instanceof SyntaxError) {
      outgoingResponse.statusCode = 400;
      outgoingResponse.end(
        JSON.stringify({
          ok: false,
          error: {
            code: "invalid_json",
            message: "Request body is not valid JSON."
          }
        })
      );
      return;
    }

    console.error(caughtError);
    outgoingResponse.statusCode = 500;
    outgoingResponse.end(
      JSON.stringify({
        ok: false,
        error: {
          code: "internal_server_error",
          message: "Unexpected API error."
        }
      })
    );
  }
});

server.listen(port, host, () => {
  console.log(`API dev server listening on http://localhost:${port}`);
});
