import type File from "./file.js";

export interface MediasConfigs {
  // IPFS
  ipfsGatewayUrl?: string,
}


export interface AssetFiles {
  metadata?: File,
  medias: File[],
}