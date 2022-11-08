import type File from "./file.js";

export interface AssetFiles {
  metadata?: File,
  medias: File[],
}