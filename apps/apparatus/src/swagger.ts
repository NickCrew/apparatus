export const swaggerDocument = {
  "openapi": "3.0.0",
  "info": {
    "title": "Tracer (Apparatus) API",
    "version": "1.0.0",
    "description": "Universal Network Simulation Platform for testing WAFs, Gateways, and Egress Filters."
  },
  "servers": [
    {
      "url": "/"
    }
  ],
  "paths": {
    "/echo": {
      "get": {
        "tags": ["Core"],
        "summary": "Echo Request",
        "description": "Returns details about the HTTP request.",
        "parameters": [
          {
            "in": "query",
            "name": "status",
            "schema": { "type": "integer", "example": 200 },
            "description": "Force a specific HTTP status code response."
          },
          {
            "in": "query",
            "name": "delay",
            "schema": { "type": "integer", "example": 500 },
            "description": "Inject a delay in milliseconds before responding."
          }
        ],
        "responses": {
          "200": { "description": "Successful echo" }
        }
      }
    },
    "/sysinfo": {
      "get": {
        "tags": ["Core"],
        "summary": "System Information",
        "description": "Retrieve container environment, OS, and runtime stats.",
        "responses": {
          "200": { "description": "JSON object with system details" }
        }
      }
    },
    "/dns": {
      "get": {
        "tags": ["Infra Debugging"],
        "summary": "DNS Resolver",
        "parameters": [
          { "in": "query", "name": "target", "required": true, "schema": { "type": "string" }, "description": "Host to resolve" },
          { "in": "query", "name": "type", "schema": { "type": "string", "default": "A" }, "description": "Record type (A, AAAA, MX, etc)" }
        ],
        "responses": {
          "200": { "description": "Resolution results" }
        }
      }
    },
    "/ping": {
      "get": {
        "tags": ["Infra Debugging"],
        "summary": "TCP Connectivity Check",
        "parameters": [
          { "in": "query", "name": "target", "required": true, "schema": { "type": "string" }, "description": "host:port to test" }
        ],
        "responses": {
          "200": { "description": "Connection result" }
        }
      }
    },
    "/hooks/{id}": {
      "post": {
        "tags": ["Infra Debugging"],
        "summary": "Webhook Sink",
        "parameters": [
          { "in": "path", "name": "id", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Webhook received" }
        }
      }
    },
    "/redteam/validate": {
      "get": {
        "tags": ["Security"],
        "summary": "Red-Team Validation Scan",
        "description": "Scan a target URL with a library of malicious payloads to test WAF effectiveness.",
        "parameters": [
          { "in": "query", "name": "target", "schema": { "type": "string" }, "description": "Target base URL" },
          { "in": "query", "name": "path", "schema": { "type": "string" }, "description": "Target path to hit" }
        ],
        "responses": {
          "200": { "description": "Validation summary and details" }
        }
      }
    },
    "/api/redteam/fuzzer/run": {
      "post": {
        "tags": ["Security"],
        "summary": "Execute One Live Fuzzer Request",
        "description": "Run a single operator-defined request against a target and return normalized response telemetry. Targets are loopback-only unless APPARATUS_FUZZER_ALLOWED_TARGETS is configured.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "target": { "type": "string", "description": "Base URL. Defaults to current Apparatus host." },
                  "path": { "type": "string", "default": "/echo" },
                  "method": { "type": "string", "default": "GET" },
                  "headers": {
                    "type": "object",
                    "additionalProperties": { "type": "string" }
                  },
                  "query": {
                    "type": "object",
                    "additionalProperties": {
                      "oneOf": [{ "type": "string" }, { "type": "number" }, { "type": "boolean" }]
                    }
                  },
                  "body": { "description": "Arbitrary request body forwarded upstream for body-capable methods." },
                  "timeoutMs": { "type": "number", "default": 5000 }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Execution metadata and normalized response output",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "request": {
                      "type": "object",
                      "properties": {
                        "method": { "type": "string" },
                        "url": { "type": "string" },
                        "timeoutMs": { "type": "number" },
                        "hasBody": { "type": "boolean" }
                      }
                    },
                    "response": {
                      "type": "object",
                      "properties": {
                        "status": { "type": "number", "nullable": true },
                        "blocked": { "type": "boolean" },
                        "durationMs": { "type": "number" },
                        "headers": { "type": "object", "additionalProperties": { "type": "string" } },
                        "bodyBytes": { "type": "number", "description": "Bytes observed before capture limits are applied." },
                        "bodyPreview": { "type": "string" },
                        "bodyTruncated": { "type": "boolean" },
                        "error": { "type": "string" },
                        "errorCode": { "type": "string" }
                      }
                    }
                  }
                }
              }
            }
          },
          "400": {
            "description": "Invalid request payload",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "error": { "type": "string" }
                  }
                }
              }
            }
          },
          "403": { "description": "Security gate blocked non-local request origin" }
        }
      }
    },
    "/sentinel/rules": {
      "get": {
        "tags": ["Defense"],
        "summary": "List Active Shield Rules",
        "responses": { "200": { "description": "List of active rules" } }
      },
      "post": {
        "tags": ["Defense"],
        "summary": "Add Active Shield Rule",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "pattern": { "type": "string" },
                  "action": { "type": "string", "enum": ["block", "log"] }
                }
              }
            }
          }
        },
        "responses": { "200": { "description": "Rule added" } }
      }
    },
    "/mtd": {
      "post": {
        "tags": ["Defense"],
        "summary": "Rotate MTD Prefix",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": { "prefix": { "type": "string" } }
              }
            }
          }
        },
        "responses": { "200": { "description": "Prefix rotated" } }
      }
    },
    "/dlp": {
      "get": {
        "tags": ["Security"],
        "summary": "Data Loss Prevention Simulator",
        "parameters": [
          { "in": "query", "name": "type", "schema": { "type": "string", "enum": ["cc", "ssn", "email", "sql"] } }
        ],
        "responses": { "200": { "description": "Fake sensitive data" } }
      }
    },
    "/ghosts": {
      "get": {
        "tags": ["Advanced Logic"],
        "summary": "Behavioral Ghost Traffic",
        "description": "Start or stop background traffic generation to simulate user activity.",
        "parameters": [
          { "in": "query", "name": "action", "schema": { "type": "string", "enum": ["start", "stop"] }, "description": "Action to perform" },
          { "in": "query", "name": "target", "schema": { "type": "string" }, "description": "Target base URL (default: localhost)" },
          { "in": "query", "name": "delay", "schema": { "type": "integer", "default": 1000 }, "description": "Delay between requests in ms" }
        ],
        "responses": {
          "200": { "description": "Status of ghost traffic" }
        }
      }
    },
    "/script": {
      "post": {
        "tags": ["Advanced Logic"],
        "summary": "Execute JS Script",
        "description": "Run safe JavaScript code in a sandbox (vm). Timeout: 100ms.",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["code"],
                "properties": {
                  "code": { "type": "string", "example": "result = input.a + input.b;" },
                  "input": { "type": "object", "example": { "a": 1, "b": 2 } }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "Execution result and logs" }
        }
      }
    },
    "/kv/{key}": {
      "get": {
        "tags": ["Advanced Logic"],
        "summary": "Get KV Value",
        "parameters": [
          { "in": "path", "name": "key", "required": true, "schema": { "type": "string" } }
        ],
        "responses": {
          "200": { "description": "Value found" },
          "404": { "description": "Key not found" }
        }
      },
      "put": {
        "tags": ["Advanced Logic"],
        "summary": "Set KV Value",
        "parameters": [
          { "in": "path", "name": "key", "required": true, "schema": { "type": "string" } }
        ],
        "requestBody": {
          "content": { "application/json": { "schema": { "type": "object" } } }
        },
        "responses": { "200": { "description": "Value set" } }
      },
      "delete": {
        "tags": ["Advanced Logic"],
        "summary": "Delete KV Value",
        "parameters": [
          { "in": "path", "name": "key", "required": true, "schema": { "type": "string" } }
        ],
        "responses": { "204": { "description": "Value deleted" } }
      }
    }
  }
};
