import type AlgoStack from '../../index';
import type { Payload } from '../../index';
import type Cache from '../cache/index';
import type { File } from '../files/index'
import { getIpfsFromAddress } from '../../helpers/files.js';
import { Arc, Encoding, MediaType } from '../../enums.js';
import { pRateLimit } from 'p-ratelimit';
import { AssetFiles, AssetFilesOptions, AssetProperties, AssetTraits, MediasConfigs } from './types.js';
import { BaseModule } from '../_baseModule.js';
import Files from '../files/index.js';
import merge from 'lodash-es/merge.js';
import { isDomainUrl } from '../../helpers/strings.js';
import { CacheTable } from '../cache/index.js';
import { defaultsDeep } from 'lodash-es';
import { AssetParams } from 'algosdk/dist/types/client/v2/indexer/models/types.js';
import { B64Decoder } from '../../helpers/encoding.js';


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
  public async getAssetFiles(id: number, options: AssetFilesOptions = {}, refreshCache?: boolean): Promise<AssetFiles> {
    let files: AssetFiles =  {
      arcs: [],
      metadata: undefined,
      medias: [],
    };
    if (!id) return files;

    if (!this.initiated) await this.waitForInit();
    id = Number(id);
    options = defaultsDeep(options, {
      arcs: {
        arc3: true,
        arc19: true,
        arc69: false,
      }
    });

    let params:AssetParams = options.asset?.params;

    if (!params && this.stack.query) {
      const assetResponse = await this.stack.query.lookup.asset(id, { includeAll: true });
      params = assetResponse?.asset?.params as AssetParams|undefined;
    }

    // get cache
    if (this.cache && !refreshCache) {
      const cached = await this.cache.find(CacheTable.MEDIAS_ASSET, { 
        where: { id, options },
      });
      if (cached?.data) return cached.data;
    }
    
    // ARC3 & ARC19
    if (params?.url && !isDomainUrl(params.url)) {
      let url = params.url as string;
      const isTemplateUrl = String(url).startsWith('template-ipfs://');
      if (options.arcs.arc19 && isTemplateUrl) {
        const arc19Url = getIpfsFromAddress(params, url);
        if (arc19Url) url = arc19Url;
        const arc19Files = await this.getFiles(url)
        const isArc = arc19Files.metadata;
        if (isArc) files.arcs.push(Arc.ARC19, Arc.ARC3);
        files = this.mergeFiles(files, arc19Files);
      }
      else if (options.arcs.arc3) {
        const arc3Files = await this.getFiles(url);
        const isArc = arc3Files.metadata;
        if (isArc) files.arcs.push(Arc.ARC3);
        files = this.mergeFiles(files, arc3Files);
      }
    }
    
    // ARC69
    if (options.arcs.arc69) {
      const arc69Files = await this.getArc69(id)
      if (arc69Files.metadata) files.arcs.push(Arc.ARC69);
      files = this.mergeFiles(files, arc69Files);
    }

    // Extract Traits and Properties
    files = this.extractTraitAndProperties(files);
    
    // save cache
    if (this.cache) {
      await this.cache.save(CacheTable.MEDIAS_ASSET, files, 
        { id, options }
      );
    }

    return files;
   
  }




  /**
  * Files
  * ==================================================
  */
  public async getFiles(url: string) {
    if (!this.initiated) await this.waitForInit();
    const assetFiles: AssetFiles =  {
      arcs: [],
      medias: [],
      metadata: undefined,
    };
    const media = await this.rateLimiter( () => this.files.getMeta(url) );
    // media is json file (metadata)
    if (media.type === MediaType.JSON) {
      assetFiles.metadata = media.content as Payload;
      const arc3Files = await this.getMedias(media.content as Record<string, any>);
      assetFiles.medias.push(...arc3Files);
    }
    else if (media.type === MediaType.IMAGE || media.type === MediaType.VIDEO) {
      assetFiles.medias.push(media);
    }

    return assetFiles;
  }

  
  /**
  * Medias
  * ==================================================
  */
  private async getMedias(data: Record<string, any>) {
    let mediaFiles: File[] = [];
    // check for image
    if (data.image) {
      const media = await this.rateLimiter( () => this.files.getMeta(data.image) );
      if (media.type === MediaType.IMAGE || media.type === MediaType.VIDEO) {
        mediaFiles.push(media);
      }
    }
    else if (data.external_url) {
      const image = await this.rateLimiter( () => this.files.getMeta(data.external_url));
      if (image.type === MediaType.IMAGE) {
        mediaFiles.push(image);
      }
    }
    // check for video 
    if (data.animation_url) {
      const animation = await this.rateLimiter( () => this.files.getMeta(data.animation_url) );
      mediaFiles.push(animation);
    }
    // check for other medias
    if (data.media_url) {
      const media = await this.rateLimiter( () => this.files.getMeta(data.media_url) );
      if (media.type === MediaType.IMAGE || media.type === MediaType.VIDEO) {
        mediaFiles.push(media);
      }
    }
    return mediaFiles;
  }






  /**
  * Arc69
  * ==================================================
  */
  public async getArc69(assetId: number) {
    const assetFiles: AssetFiles =  {
      arcs: [],
      medias: [],
      metadata: undefined,
    };
    if (!assetId) return assetFiles;
    if (!this.stack?.query) return assetFiles;
    const response = await this.stack.query.lookup!.assetTransactions(assetId,{ 
      txType: 'acfg', notePrefix: '{', 
      limit: -1,
    });
    if (!response.transactions) return assetFiles;

    // // ARC69
    const arc69Txns = response.transactions
      .map((txn: Payload) => {
        if (!txn.note) return txn;
        if (!txn.addons) txn.addons = {};
        txn.addons.note = new B64Decoder(txn.note);
        return txn;
      })
      .filter((txn: Record<string, any>) => (
        txn.addons?.note.encoding === Encoding.JSON
        && String(txn.addons?.note.parsed?.json?.standard).toUpperCase() === Arc.ARC69
      ))
      .sort((a: any,b: any) => (b.confirmedRound - a.confirmedRound))
    // found arc69 
    const config = arc69Txns?.[0]?.addons?.note?.parsed?.json;
    if(!config) return assetFiles; 
    assetFiles.metadata = config;
    assetFiles.medias = await this.getMedias(config);
    return assetFiles
  }


  /**
  * Helpers
  * ==================================================
  */
  private mergeFiles(baseFiles: AssetFiles, newFiles: AssetFiles, arcs?: Arc[]) {
    return {
      arcs: [
        ...baseFiles.arcs || [],
        ...newFiles.arcs || [],
        ...arcs || [],
      ],
      metadata: merge(baseFiles?.metadata, newFiles?.metadata),
      medias: [
        ...baseFiles.medias,
        ...newFiles.medias,
      ],
    }
  }


  private extractTraitAndProperties(files: AssetFiles) {
    if (!files.metadata) return files;
    let traits: AssetTraits|undefined;
    let properties: AssetProperties|undefined;
    // properties
    if(files.metadata.properties) {
      properties = files.metadata.properties;
    }


    // arc 3
    if (properties?.traits) {
      traits = properties.traits
      delete properties.traits;
    }

    // Dartroom  x_x
    if (properties?.arc69?.attributes) {
      traits = properties.arc69.attributes
      delete properties.arc69.attributes;
    }

    // arc 69
    if (files.metadata.attributes) {
      traits = files.metadata.attributes
    }

    // convert traits array to object
    if (Array.isArray(traits)) {
      traits = Object.fromEntries(
        traits.map(trait => ([trait.trait_type, trait.value]))
      )
    }
  
    files.traits = traits;
    files.properties = properties;
    return files
  }

}

