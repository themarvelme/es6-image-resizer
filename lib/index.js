import config from 'config';
import ImageResizer from './image-resizer';

export default function main() {

  const resizer = new ImageResizer(config);

  /*getLargeImagePathFromRepo(imageRepo, largeImagePath)
    .then(bigImages => console.log(bigImages));*/

  const bigImagePath = 'https://s3.amazonaws.com/f.cl.ly/items/240l2b3f1e0j1G0b1i3Z/iStock_000001648333_Large.jpg?v=4147c264';

  resizer
    .resizeSingleAndUpload(bigImagePath, [null, 250, 750, 1500])
    .then(res => console.log('finished!', res))
    .catch(error => {
      console.log('i am dying');
      console.log(error);
    });
}
