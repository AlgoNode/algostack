import axios from 'axios';

/**
 * Get file type for a remote URL
 * abort request as soon as headers are in
 * inspired by https://stackoverflow.com/questions/38679681/getting-a-file-type-from-url#answer-38679875
 * ==================================================
 */
 export function getFileContent(url: string): Promise<string|undefined> {
  return new Promise(async resolve => {
    try {
      const response = await axios.get(url);
      resolve(response.data);
    } 
    catch (e) {
      resolve(undefined);
    }
  })
}


/**
 * Get file type for a remote URL
 * abort request as soon as headers are in
 * inspired by https://stackoverflow.com/questions/38679681/getting-a-file-type-from-url#answer-38679875
 * ==================================================
 */
 export function getFileType(url: string): Promise<string> {
  return new Promise(async resolve => {
    try {
      const head = await axios.head(url);
      const contentType = head.headers['content-type']; 
      resolve(contentType);
    } 
    catch (e) {
      resolve(undefined);
    }
  });
}