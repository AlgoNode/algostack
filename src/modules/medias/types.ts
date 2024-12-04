import type { File } from '../files/index.js';
import type {
  AssetPayload,
  Payload,
  RateLimiterConfig,
} from '../query/types.js';

import { Arc } from '../../enums.js';

export interface MediasConfigs {
  rateLimiter?: RateLimiterConfig;
}

export interface AssetFiles {
  arcs: Arc[];
  medias: File[];
  metadata?: Payload;
  properties?: AssetProperties;
  traits?: AssetTraits;
}

export interface AssetFilesOptions {
  asset?: AssetPayload;
  arcs?: {
    arc3?: boolean;
    arc19?: boolean;
    arc69?: boolean;
  };
}

export type AssetProperties = Record<string, any>;
export type AssetTraits = Record<string, string | number>;
