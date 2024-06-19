import { Arc } from "../../enums.js";
import type { File } from "../files/index.js";
import type { AssetPayload, Payload, RateLimiterConfig } from "../query/types.js";

export interface MediasConfigs {
  rateLimiter?: RateLimiterConfig,
}

export interface AssetFiles {
  arcs: Arc[],
  medias: File[],
  metadata?: Payload,
}

export interface AssetFilesOptions {
  asset?: AssetPayload,
  arcs?: {
    arc3?: boolean,
    arc19?: boolean, 
    arc69?: boolean,
  },
}