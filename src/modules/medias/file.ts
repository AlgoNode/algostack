import axios from 'axios';
import { MediaType } from '../../enums.js';
import { getFileType, getIpfsCid, getIpfsUrl, getRedirectedURL } from '../../helpers/files.js';
import { isDomainUrl, isMediaFileUrl, isUrl } from '../../helpers/strings.js';

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
    if (this.cid) this.url = getIpfsUrl(this.cid);
    if (isUrl(this.url) && !/^https:\/\//.test(this.url)) {
      this.url = `https://${this.url}`;
    }
    if (isDomainUrl(this.url)) {
      this.mime = 'text/html';
    }
    else {
      this.mime = await getFileType(this.url);
    }
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
    if (/^(application\/json|text\/plain(;?))/.test(this.mime)) {
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

