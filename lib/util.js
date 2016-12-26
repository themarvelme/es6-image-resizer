import url from 'url';
import path from 'path';

export function parseUrl(filePath) {
  const filename = path.basename(url.parse(filePath).pathname);

  return {
    name: filename.substr(0, filename.lastIndexOf(".")),
    ext: filename.substr(filename.lastIndexOf(".") + 1, filename.length)
  };
}
