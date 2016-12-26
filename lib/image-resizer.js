import axios from 'axios';
import http from 'http';
import request from 'request';
import AWS from 'aws-sdk';
import sharp from 'sharp';
import { PassThrough } from 'stream';

import { parseUrl} from './util';

export default class ImageResizer {
  constructor(config, targetWidths = [null, 250, 750, 1500]) {
    this.config = config;
    this.targetWidths = targetWidths;

    if (!this.config.get('imageRepo.url')
     || !this.config.get('imageRepo.placeholder')
     || !this.config.get('aws.accessKeyId')
     || !this.config.get('aws.secretAccessKey')
     || !this.config.get('aws.bucketName')) {
      throw new Error('class ImageResizer - Invalid configuration');
    }

    AWS.config.update(this.config.get('aws'));
    this.s3 = new AWS.S3();
  }

  errorHander(error) {
    console.log("Error occured! ", error);
  }

  start() {
    return this
      .getLargeImagePathFromRepo()
      .then(largeImageURLs =>
        Promise.all(
          largeImageURLs
            .map(url => this.resizeSingleAndUpload(url, this.targetWidths))
        )
      )
      .catch(this.errorHander);
  }

  getLargeImagePathFromRepo() {
    const { url, placeholder } = this.config.get('imageRepo');

    const promises = axios.get(url)
      .then(res => res.data)
      .then(images => images.map(i => i.id))
      .then(ids =>
        Promise.all(
          ids.map(id => axios
            .get(placeholder.replace('{{ ID }}', id))
            .then(res => res.data.url)
          )
        )
      )
      .catch(this.errorHander);

    return promises;
  }

  getStreamsAfterResize(sourceURL, targetWidths) {
    const sourceStream = request(sourceURL).on('error', this.errorHander);

    return targetWidths
      .map(width => {
        return width
          ? sourceStream
            .pipe(sharp().resize(width))
            .on('error', this.errorHander)
          : sourceStream;
      });
  }

  resizeSingleAndUpload(sourceURL, targetWidths) {
    const streams = this.getStreamsAfterResize(sourceURL, targetWidths);
    const { name, ext } = parseUrl(sourceURL);

    return Promise.all(
      streams.map((s, idx) => {
        const targetKey = [name + (targetWidths[idx] || ''), ext].join('.');

        return this.uploadToS3(s, targetKey);
      })
    );
  }

  uploadToS3(sourceStream, key) {
    const bucketName = this.config.get('aws.bucketName');
    const passthrough = new PassThrough();
    // reason why use passthrough
    // http://stackoverflow.com/questions/28688490/untarring-files-to-s3-fails-not-sure-why

    sourceStream.pipe(passthrough);

    return new Promise((resolve, reject) => {
      this.s3.upload({
        Bucket: bucketName,
        Key: key,
        Body: passthrough
      }, function (err) {
        if (err) { return reject(err); }
        resolve(key);
      });
    });
  }
}
