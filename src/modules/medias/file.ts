import axios from 'axios';
import { MediaType } from './enums.js';
import { getFileType, getIpfsCid, getIpfsUrl, getRedirectedURL } from '../../helpers/files.js';

/**
 * File class
 * ==================================================
 */
export default class File {
  public originalUrl: string;
  public url: string;
  public cid?: string;
  public type?: MediaType;
  public mime?: string;
  public thumbnail?: string;
  public content?: string|Record<string, any>;

  /**
   * Constructor
   * ==================================================
   */
  constructor (url: string, ) {
    this.originalUrl = url;
    this.url = url;
  }


  /**
   * load data from URL
   * ==================================================
   */
  public async check () {
    this.url = await getRedirectedURL(this.url);
    this.cid = getIpfsCid(this.url);
    this.url = this.cid ? getIpfsUrl(this.cid) : this.url; 
    this.mime = await getFileType(this.url);
    await this.setType();
    return this;
  }


  /**
   * Set props based on type
   * ==================================================
   */
  private async setType () {
    if (!this.mime) return;
    // image
    if (this.mime.startsWith('image/')) {
      this.type = MediaType.IMAGE;
      return;
    }
    // video
    if (this.mime.startsWith('video/')) {
      this.type = MediaType.VIDEO;
      return;
    }
    // json
    if (/^(application\/json(;?))/.test(this.mime)) {
      this.type = MediaType.JSON;
      await this.loadJSON();
      return;
    }
  }
  


  /**
   * load JSON media
   * ==================================================
   */
  private async loadJSON() {
    const json = await axios.get(this.url);
    if (!json.data) return;
    this.content = json.data;
  }
}

