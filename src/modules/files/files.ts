import axios from 'axios';
import { MediaType } from '../../enums.js';
import { getFileType, getIpfsCid } from '../../helpers/files.js';
import { isIpfsProtocol, isUrl } from '../../helpers/strings.js';
import { BaseModule } from '../_baseModule.js';
import { File, FilesConfigs } from './types.js';
import merge from 'lodash-es/merge.js';


/**
 * Files class
 * ==================================================
 */
export default class Files extends BaseModule {
  protected configs: FilesConfigs = {};

  /**
   * Constructor
   * ==================================================
   */
  constructor(configs: FilesConfigs = {}) {
    super();
    this.setConfigs(configs);
  }

  public setConfigs(configs: FilesConfigs) {
    super.setConfigs(configs);
    this.configs = merge({
      ipfsGatewayUrl: 'https://ipfs.algonode.xyz/ipfs',
      transformUrl: undefined,
    }, this.configs, configs);
  }
  /**
   * load data from URL
   * ==================================================
   */
  public async getMeta(url: string) {
    const file: File = {
      originalUrl: url,
      url: url,
      cid: undefined,
      type: undefined,
      mime: undefined,
      thumbnail: undefined,
      content: undefined,
    }
    if (this.configs.transformUrl) file.url = await Promise.resolve(this.configs.transformUrl(url));
    if (!isUrl(file.url) && !isIpfsProtocol(file.url)) return file;
    file.cid = getIpfsCid(file.url);
    if (file.cid) file.url = this.getIpfsUrl(file.cid);
    if (!file.cid && !/^(http|https):\/\//.test(file.url)) {
      file.url = `https://${file.url}`;
    }
    file.mime = await getFileType(file.url);
    await this.setType(file);
    return file;
  }


  /**
   * Set props based on type
   * ==================================================
   */
  private async setType(file: File) {
    if (!file.mime) return;
    // image
    if (file.mime.startsWith('image/')) {
      file.type = MediaType.IMAGE;
      return;
    }
    // video
    if (file.mime.startsWith('video/')) {
      file.type = MediaType.VIDEO;
      return;
    }
    // json
    if (/^(application\/json|text\/plain(;?))/.test(file.mime)) {
      file.type = MediaType.JSON;
      await this.loadJSON(file);
      return;
    }
  }
  


  /**
   * load JSON media
   * ==================================================
   */
  private async loadJSON(file: File) {
    const json = await axios.get(file.url);
    if (!json.data) return;
    file.content = json.data;
  }


  /**
   * Get an IPFS gateway url for a specific cid
   * ==================================================
   */

  public getIpfsUrl(cid: string) {
    return `${this.configs.ipfsGatewayUrl}/${cid}`;
  }

}

