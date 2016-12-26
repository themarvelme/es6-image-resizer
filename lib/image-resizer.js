import axios from 'axios';
import http from 'http';
// import { Transform as Stream } from 'stream';
import request from 'request';
import sharp from 'sharp';
import fs from 'fs';
import url from 'url';
import path from 'path';
import AWS from 'aws-sdk';
import { PassThrough } from 'stream';

export default class ImageResizer {
  constructor(config) {
    this.config = config;

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
    const {name, ext} = this.parseUrl(sourceURL);

    return Promise.all(
      streams.map((s, idx) => {
        const targetKey = [name + (targetWidths[idx] || ''), ext].join('.');

        return this.uploadToS3(s, targetKey);
      })
    );
  }

  uploadOrigin(sourceURL) {
    const bucketName = this.config.get('aws.bucketName');
    const readStream = request(sourceURL).on('error', this.errorHander);;
    const passthrough = new PassThrough();

    readStream.pipe(passthrough);

    this.uploadToS3(readStream, 'test.jpg')
      .then(() => console.log('success'))
      .catch((e) => console.log('iduno:', e));
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

  parseUrl(filePath) {
    const filename = path.basename(url.parse(filePath).pathname);

    return {
      name: filename.substr(0, filename.lastIndexOf(".")),
      ext: filename.substr(filename.lastIndexOf(".") + 1, filename.length)
    };
  }
}
