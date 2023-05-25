import { MediaType } from "../../enums.js";

export interface FilesConfigs {
  // IPFS
  ipfsGatewayUrl?: string,
}

export interface File {
  originalUrl: string;
  url: string;
  cid?: string;
  type?: MediaType;
  mime?: string;
  thumbnail?: string;
  content?: string|Record<string, any>;
}
