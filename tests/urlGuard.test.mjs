import assert from "node:assert/strict";
import dns from "node:dns";
import { EventEmitter } from "node:events";
import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import test from "node:test";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";
import { createJiti } from "jiti";

const urlGuardUrl = new URL("../lib/urlGuard.js", import.meta.url);
const jiti = createJiti(import.meta.url, { interopDefault: true });

function loadUrlGuard() {
  return jiti.import(fileURLToPath(urlGuardUrl));
}

function requestStub(onEnd) {
  const request = new EventEmitter();
  request.write = () => {};
  request.end = () => queueMicrotask(() => onEnd(request));
  request.destroy = (error) => {
    if (error) queueMicrotask(() => request.emit("error", error));
  };
  return request;
}

function responseStream(body, headers = {}) {
  const response = Readable.from([body]);
  response.statusCode = 200;
  response.statusMessage = "OK";
  response.headers = headers;
  response.socket = null;
  return response;
}

test("rejects canonical and expanded IPv4-mapped private IPv6 destinations before connecting", async (context) => {
  const { guardedFetch } = await loadUrlGuard();
  let connections = 0;
  context.mock.method(http, "request", () => {
    connections++;
    throw new Error("Unexpected connection attempt");
  });
  for (const host of ["::ffff:127.0.0.1", "::ffff:7f00:1", "0:0:0:0:0:ffff:a00:1", "::ffff:a9fe:a9fe", "0:0:0:0:0:0:0:1"]) {
    await assert.rejects(guardedFetch(`http://[${host}]/`), /private, loopback, or link-local/i);
  }
  assert.equal(connections, 0);
});

test("rejects private connection-time DNS results for HTTP and HTTPS", async (context) => {
  const { guardedFetch } = await loadUrlGuard();
  const observedLookups = [];

  context.mock.method(dns, "lookup", (_hostname, _options, callback) => {
    callback(null, [{ address: "169.254.169.254", family: 4 }]);
  });

  for (const transport of [http, https]) {
    context.mock.method(transport, "request", (_url, options) =>
      requestStub((request) => {
        observedLookups.push(options.lookup);
        options.lookup("rebind.example", {}, (error) => request.emit("error", error));
      })
    );
  }

  await assert.rejects(guardedFetch("http://93.184.216.34/"), /private, loopback, or link-local/i);
  await assert.rejects(guardedFetch("https://93.184.216.34/"), /private, loopback, or link-local/i);
  assert.equal(observedLookups.length, 2);
  assert.ok(observedLookups.every((lookup) => typeof lookup === "function"));
});

test("decodes compressed responses without synchronous zlib calls", async (context) => {
  const { guardedFetch } = await loadUrlGuard();
  const expected = "asynchronous decompression";
  const compressed = zlib.gzipSync(Buffer.from(expected));

  context.mock.method(zlib, "gunzipSync", () => {
    throw new Error("synchronous decompression was used");
  });
  context.mock.method(http, "request", (_url, _options, onResponse) =>
    requestStub(() => onResponse(responseStream(compressed, { "content-encoding": "gzip" })))
  );

  const { response } = await guardedFetch("http://93.184.216.34/");
  assert.equal(await response.text(), expected);
});

test("accepts an empty compressed HEAD response", async (context) => {
  const { guardedFetch } = await loadUrlGuard();

  context.mock.method(http, "request", (_url, _options, onResponse) =>
    requestStub(() => onResponse(responseStream(Buffer.alloc(0), { "content-encoding": "gzip" })))
  );

  const { response } = await guardedFetch("http://93.184.216.34/", { method: "HEAD" });
  assert.equal(await response.text(), "");
});

test("rejects responses that exceed the encoded body limit", async (context) => {
  const { guardedFetch } = await loadUrlGuard();
  const oversizedBody = Buffer.alloc(8 * 1024 * 1024 + 1);

  context.mock.method(http, "request", (_url, _options, onResponse) =>
    requestStub(() => onResponse(responseStream(oversizedBody)))
  );

  await assert.rejects(guardedFetch("http://93.184.216.34/"), /response exceeded the 8 mib download limit/i);
});

test("rejects compressed responses that exceed the decoded body limit", async (context) => {
  const { guardedFetch } = await loadUrlGuard();
  const compressed = zlib.gzipSync(Buffer.alloc(16 * 1024 * 1024 + 1));

  context.mock.method(http, "request", (_url, _options, onResponse) =>
    requestStub(() => onResponse(responseStream(compressed, { "content-encoding": "gzip" })))
  );

  await assert.rejects(guardedFetch("http://93.184.216.34/"), /response exceeded the 16 mib decompressed limit/i);
});
