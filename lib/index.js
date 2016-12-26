import config from 'config';
import ImageResizer from './image-resizer';

export default function main() {

  const resizer = new ImageResizer(config);

  resizer
    .start()
    .then(data => {
      console.log('Resizing and Uploading finished!');
      console.log(data);
    });
}
