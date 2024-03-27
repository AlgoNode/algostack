import type Cache from '../cache/index.js';
import type { File } from '../files/index.js'
import { getIpfsFromAddress } from '../../helpers/files.js';
import { MediaType } from '../../enums.js';
import { pRateLimit } from 'p-ratelimit';
import { AssetFiles, MediasConfigs } from './types.js';
import { BaseModule } from '../_baseModule.js';
import AlgoStack from '../../index.js';
import Files from '../files/index.js';
import merge from 'lodash-es/merge.js';
import { isDomainUrl } from '../../helpers/strings.js';
import { CacheTable } from '../cache/index.js';


/**
 * Media module
 * ==================================================
 */
export default class Medias extends BaseModule {
  private configs: MediasConfigs = {};
  protected cache?: Cache;
  protected files?: Files;
  protected rateLimiter: <T>(fn: () => Promise<T>) => Promise<T>;
  constructor(configs: MediasConfigs) {
    super();
    this.setConfigs(configs);
  }

  public setConfigs(configs: MediasConfigs) {
    super.setConfigs(configs);
    this.configs = merge({}, this.configs, configs);
    this.initRateLimiter();
  }
 
  public init(stack: AlgoStack) {
    super.init(stack);
    this.cache = stack.cache;
    this.files = stack.files;
    if (!this.files) throw new Error('Files module is required.')
    return this;
  }

  /**
  * Rate Limiters
  * ==================================================
  */
  private initRateLimiter(){
    const defaultConfigs = {
      interval: 1000,
      rate: 50,
      concurrency: 25,
      ...(this.configs.rateLimiter || {}),
    };
    this.rateLimiter = pRateLimit(defaultConfigs);
  }

  /**
  * Get all medias for an asset
  * uses the params object of an asset
  * ==================================================
  */
  public async getAssetFiles(id: number, assetProps: Record<string, any>, refreshCache?: boolean): Promise<AssetFiles> {
    return new Promise(async resolve => {
      let files: AssetFiles =  {
        metadata: undefined,
        medias: [],
      };
      const params = assetProps?.params; 
      if (!id || !params.url) return resolve(files);
      id = Number(id);

      // get cache
      if (this.cache && !refreshCache) {
        const cached = await this.cache.find(CacheTable.MEDIAS_ASSET, { where: { id }});
        if (cached?.data) return resolve(cached.data);
      }
      // only check if not a domain url
      if (!isDomainUrl(params.url)) {
        // get medias
        let url = params.url as string;
        if (String(params.url).startsWith('template-ipfs://')) {
          const arc19Url = getIpfsFromAddress(params, url);
          if (arc19Url) url = arc19Url;
        }
        files = await this.getMedias(url);
      };

      // save cache
      if (this.cache) {
        await this.cache.save(CacheTable.MEDIAS_ASSET, files, { id });
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
      const media = await this.rateLimiter( () => this.files.getMeta(data.image) );
      if (media.type === MediaType.IMAGE || media.type === MediaType.VIDEO) {
        arc3Files.push(media);
      }
    }
    else if (data.external_url) {
      const image = await this.rateLimiter( () => this.files.getMeta(data.external_url));
      if (image.type === MediaType.IMAGE) {
        arc3Files.push(image);
      }
    }
    // check for video {
    if (data.animation_url) {
      // const animation = await new File(data.animation_url).check();
      const animation = await this.rateLimiter( () => this.files.getMeta(data.animation_url) );
      arc3Files.push(animation);
    }
    return arc3Files;
  }



  /**
  * Get media
  * ==================================================
  */
  public async getMedias(url: string) {
    const assetFiles: AssetFiles =  {
      metadata: undefined,
      medias: [],
    };
    const media = await this.rateLimiter( () => this.files.getMeta(url) );
    // media is json file (metadata)
    if (media.type === MediaType.JSON) {
      assetFiles.metadata = media;
      const arc3Files = await this.getArc3(media.content as Record<string, any>);
      assetFiles.medias.push(...arc3Files);
    }
    else {
      assetFiles.medias.push(media);
    }

    return assetFiles;
  }

}

