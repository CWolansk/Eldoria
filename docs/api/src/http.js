"use strict";

const DEFAULT_ALLOWED_ORIGINS = "*";

function getAllowedOrigins() {
  return String(process.env.ELDORIA_ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function getRequestOrigin(request) {
  return request.headers?.get?.("origin") || "";
}

function getCorsOrigin(request) {
  const allowedOrigins = getAllowedOrigins();
  if (!allowedOrigins.length || allowedOrigins.includes("*")) {
    return "*";
  }

  const requestOrigin = getRequestOrigin(request);
  if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    return requestOrigin;
  }

  return allowedOrigins[0];
}

function headers(request, extra = {}) {
  return {
    "Access-Control-Allow-Origin": getCorsOrigin(request),
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, x-functions-key",
    "Access-Control-Max-Age": "86400",
    "Cache-Control": "no-store",
    ...extra
  };
}

function json(request, status, body, extraHeaders = {}) {
  return {
    status,
    headers: headers(request, {
      "content-type": "application/json; charset=utf-8",
      ...extraHeaders
    }),
    body: JSON.stringify(body)
  };
}

function noContent(request) {
  return {
    status: 204,
    headers: headers(request)
  };
}

function options(request) {
  return noContent(request);
}

function httpError(statusCode, message, details = {}) {
  return Object.assign(new Error(message), {
    statusCode,
    details
  });
}

function logServerError(context, error) {
  if (typeof context?.error === "function") {
    context.error(error);
    return;
  }

  if (typeof context?.log === "function") {
    context.log(error?.stack || error?.message || String(error));
  }
}

function errorResponse(request, context, error) {
  const status = Number(error?.statusCode || error?.status || 500);
  if (status >= 500) {
    logServerError(context, error);
  }

  return json(request, status, {
    error: status >= 500 ? "Internal server error." : error.message,
    details: status >= 500 ? undefined : error.details
  });
}

async function withErrors(request, context, action) {
  if (request.method === "OPTIONS") {
    return options(request);
  }

  try {
    return await action();
  } catch (error) {
    return errorResponse(request, context, error);
  }
}

module.exports = {
  httpError,
  json,
  noContent,
  options,
  withErrors
};
