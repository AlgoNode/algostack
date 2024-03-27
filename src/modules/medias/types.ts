import type { File } from "../files/index.js";
import type { RateLimiterConfig } from "../query/types.js";

export interface MediasConfigs {
  rateLimiter?: RateLimiterConfig,
}

export interface AssetFiles {
  metadata?: File,
  medias: File[],
}