import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { credential } from 'firebase-admin';
import { getStorage } from 'firebase-admin/storage';
import applicationDefault = credential.applicationDefault;
const axios = require('axios');
const ogs = require('open-graph-scraper');

export const fetchPreviewImage = functions.https.onRequest((request, response) => {
  if (request.method !== 'POST') {
    response.status(405);
    response.send();
    return;
  }
  if (!JSON.parse(request.body).url) {
    response.status(422);
    response.send();
    return;
  }
  if (!JSON.parse(request.body).token) {
    response.status(422);
    response.send();
    return;
  }
  if (admin.apps.length < 1) {
    admin.initializeApp({
      credential: applicationDefault(),
    });
  }

  admin.auth().verifyIdToken(JSON.parse(request.body).token).then(() => {
    const url = JSON.parse(request.body).url;
    const options = { url };
    ogs(options).then((data: any) => {
      const { result } = data;
      const bucket = getStorage().bucket('browserextension-bc94e.appspot.com');
      if (!result.ogImage ||
        result.ogImage.length < 1 ||
        !result.ogImage[0].url) {
        bucket.upload('./src/default-image.jpg', {
          destination: 'preview_images/' + url.replaceAll('/', '-') + '.jpg',
        }).then(() => {
          response.status(200);
          response.send();
          return;
        }).catch(() => {
          response.status(400);
          response.send();
          return;
        });
      }
      if (result.ogImage[0].url) {
        axios({
          url: result.ogImage[0].url,
          method: 'GET',
          responseType: 'stream',
        }).then((responseStream: any) => {
          const file = bucket.file('preview_images/' + url.replaceAll('/', '-') + '.jpg');
          responseStream.data.pipe(file.createWriteStream()).on('finish', () => {
            response.status(200);
            response.send();
            return;
          });
        }).catch(() => {
          response.status(401);
          response.send();
          return;
        });
      }
    }).catch(() => {
      response.status(400);
      response.send();
      return;
    });
  }).catch(() => {
    response.status(401);
    response.send();
    return;
  });
});
