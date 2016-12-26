## ImageResizer

ImageResizer reads large image files from online repo and upload to Amazon S3 bucket after resize the image.

It uses [sharp](http://sharp.dimens.io/en/stable/) for resizing image, [AWS SDK](https://aws.amazon.com/sdk-for-node-js/) for pushing to S3 bucket.
All operations are being done on the fly which doesn't need the in-memory dump.

## Configuration

You will need to create `development.json` in `config` directory.
Fill the aws config to make sure of its correct working.
It will overwrite the `default.json` configuration when it runs on development env.
