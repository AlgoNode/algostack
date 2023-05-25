import type { File } from "../files/index.js";

export interface MediasConfigs {}

export interface AssetFiles {
  metadata?: File,
  medias: File[],
}