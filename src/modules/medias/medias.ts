import { getIpfsFromAddress } from '../../helpers/files.js';
import { MediaType } from './enums.js';
import { pRateLimit } from 'p-ratelimit';
import AlgoStack from '../../index.js';
import type Cache from '../cache/index.js';
import File from './file.js'
import { AssetFiles } from './types.js';

/**
 * Media module
 * ==================================================
 */
export default class Medias {
  protected cache?: Cache;
  protected rateLimit: <T>(fn: () => Promise<T>) => Promise<T>;
  constructor(forwarded: AlgoStack) {
    this.cache = forwarded.cache;
    this.rateLimit = pRateLimit({
      interval: 1000,
      rate: 100, 
    });
  }
 

  /**
  * Get all medias for an asset
  * uses the params object of an asset
  * ==================================================
  */
  public async getAssetFiles(id: number, assetProps: Record<string, any>): Promise<AssetFiles> {
    return new Promise(async resolve => {
      let files: AssetFiles =  {
        metadata: undefined,
        medias: [],
      };
      const params = assetProps?.params; 
      if (!id || !params.url) return resolve(files);

      // get cache
      if (this.cache) {
        const cached = await this.cache.find('medias', { id });
        if (cached?.data) return resolve(cached.data);
      }

      // get medias
      let url = params.url as string;
      if (String(params.url).startsWith('template-ipfs://')) {
        const arc19Url = getIpfsFromAddress(url, params);
        if (arc19Url) url = arc19Url;
      }
      files = await this.getMedias(url);
      
      // save cache
      if (this.cache) {
        await this.cache.save('medias', files, { id });
      }

      resolve(files);
    });
  }



  /**
  * ARC3
  * ==================================================
  */
  private async getArc3(data: Record<string, any>) {
    let arc3Files: File[] = [];
    // check for image
    if (data.image) {
      // const image = await new File(data.image).check();
      const image = await this.rateLimit( () => new File(data.image).check() );
      if (image.type === MediaType.IMAGE) {
        arc3Files.push(image);
      }
    }
    // check for video {
    if (data.animation_url) {
      // const animation = await new File(data.animation_url).check();
      const animation = await this.rateLimit( () => new File(data.animation_url).check() );
      arc3Files.push(animation);
    }
    return arc3Files;
  }



  /**
  * Get media
  * ==================================================
  */
  public async getMedias(url: string) {
    const files: AssetFiles =  {
      metadata: undefined,
      medias: [],
    };
    const file = await this.rateLimit( () => new File(url).check() );
    // media is json file (metadata)
    if (file.type === MediaType.JSON) {
      files.metadata = file;
      const arc3Files = await this.getArc3(file.content as Record<string, any>);
      files.medias.push(...arc3Files);
    }
    else {
      files.medias.push(file);
    }

    return files;
  }

}

