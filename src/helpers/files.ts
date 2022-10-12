/**
 * Get file type for a remote URL
 * abort request as soon as headers are in
 * inspired by https://stackoverflow.com/questions/38679681/getting-a-file-type-from-url#answer-38679875
 * ==================================================
 */
 export function getFileContent(url: string): Promise<string|undefined> {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onload = () => {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          return resolve(xhr.responseText);
        } 
        return resolve(undefined);
      }
    };
    xhr.onerror = (e) => {
      return resolve(undefined);
    };
    xhr.send();
  })
}


/**
 * Get file type for a remote URL
 * abort request as soon as headers are in
 * inspired by https://stackoverflow.com/questions/38679681/getting-a-file-type-from-url#answer-38679875
 * ==================================================
 */
 export function getFileType(url: string): Promise<string> {
  return new Promise(resolve => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function() {
      // Wait for header to become available.
      const contentType = xhr.getResponseHeader('Content-Type');
      if (contentType) {
        // Stop downloading, the headers are all we need.
        xhr.abort();
        resolve(contentType);
      }
    };
    xhr.send();
  })
}