import type Cache from '../../cache/index.js';
import type Addons from '../addons.js';
import axios from 'axios';
import { Buffer } from 'buffer';
import BaseRunner from './_base.js';
import { Payload } from '../../query/index.js';
import { getFileContent } from '../../../helpers/files.js';

export default class Icon extends BaseRunner {
  protected cache: Cache;
  constructor (data: Payload, forwarded: Addons) {
    super(data, ['asset', 'assets'], 'icon', undefined);
    this.cache = forwarded?.cache;
  }

  async assets(asas: Payload) {
    if (!Array.isArray(asas)) return
    for (let i=0; i<asas.length; i++) {
      const asa = asas[i];
      await this.asset(asa)
    }
  }
  
  async asset(asa: Payload) {
    if (!asa.index) return;
    const id = asa.index;
    let icon = undefined;
    
    // get cached data
    if (this.cache) {
      const cached = await this.cache.find('addons/icon', { id });
      if (cached) {
        icon = cached.data;
        return this.save(asa, icon);
      }
    }

    const list = await this.getIconsList();
    const iconUrl = list?.[id]?.svg;
    
    // In case there is no icon
    if (!iconUrl) {
      if (this.cache) {
        await this.cache.save('addons/icon', undefined, { id });
      }
      return this.save(asa, undefined);
    }

    // Get SVG icon
    // Save as base64
    const svgContent = await getFileContent(iconUrl);
    if (svgContent) {
      const safeSvg = this.fixSvg(svgContent);
      const b64content = Buffer.from(safeSvg).toString('base64');
      icon = `data:image/svg+xml;base64,${b64content}`
    } 
    
    // cache result
    if (this.cache) {
      await this.cache.save('addons/icon', icon, { id });
    }

    return this.save(asa, icon);
  } 


  /**
  * Get the full list of icons
  * ==================================================
  */
  async getIconsList() {
    // get cached list
    if (this.cache) {
      const cached = await this.cache.find('addons/icon', { id: 0 });
      if (cached) {
        return cached.data;
      }
    }
    // get updated list
    const response = await axios.get('https://asa-list.tinyman.org/assets.json');
    const list: Record<number, any> = response.data;
    Object.entries(list).forEach(([assetId, asset]) => {
      list[assetId] = asset.logo;
    });
    // cache result
    if (this.cache) {
      await this.cache.save('addons/icon', list, { id: 0 });
    }
    return list;
  }


  /**
  * Fix SVG files
  * ==================================================
  */
  fixSvg (svg: string) {
    svg = svg.replace(/(?<=id=|fill=)(['|"][^'^"]+)(:)([^'^"]+['|"])/gm, "$1-$3");
    return svg;
  }


}