/// <reference types="astro/client" />

// Cloudflare Runtime Types
type Runtime = import('@astrojs/cloudflare').Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    // Better Auth session data (will be populated by auth middleware)
    session?: {
      user: {
        id: string;
        email: string;
        name?: string;
        avatar_url?: string;
      };
      sessionId: string;
    };
  }
}

// Cloudflare Bindings
interface Env {
  // D1 Database
  DB: D1Database;

  // KV Namespaces
  SESSION_KV: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;

  // R2 Bucket
  CANVAS_STORAGE: R2Bucket;

  // API Keys (already defined in .env)
  ANTHROPIC_API_KEY: string;
  MOONSHOT_API_KEY: string;
  GOOGLE_GEMINI_API_KEY: string;

  // Auth settings (optional)
  ENABLE_API_AUTH?: string;
  API_SECRET_KEY?: string;

  // Better Auth secrets
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;

  // OAuth credentials (optional)
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  GITHUB_CLIENT_ID?: string;
  GITHUB_CLIENT_SECRET?: string;
}

// D1 Database TypeScript definitions
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T>>;
  raw<T = unknown>(): Promise<T[]>;
}

interface D1Result<T = unknown> {
  results?: T[];
  success: boolean;
  error?: string;
  meta: {
    duration: number;
    size_after: number;
    rows_read: number;
    rows_written: number;
  };
}

interface D1ExecResult {
  count: number;
  duration: number;
}

// KV Namespace TypeScript definitions
interface KVNamespace {
  get(key: string, options?: { type: 'text' }): Promise<string | null>;
  get(key: string, options: { type: 'json' }): Promise<any | null>;
  get(key: string, options: { type: 'arrayBuffer' }): Promise<ArrayBuffer | null>;
  get(key: string, options: { type: 'stream' }): Promise<ReadableStream | null>;
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
}

interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: any;
}

interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

interface KVListResult {
  keys: Array<{
    name: string;
    expiration?: number;
    metadata?: any;
  }>;
  list_complete: boolean;
  cursor?: string;
}

// R2 Bucket TypeScript definitions
interface R2Bucket {
  head(key: string): Promise<R2Object | null>;
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string | string[]): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
}

interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  blob(): Promise<Blob>;
}

interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  include?: ('httpMetadata' | 'customMetadata')[];
}

interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}
