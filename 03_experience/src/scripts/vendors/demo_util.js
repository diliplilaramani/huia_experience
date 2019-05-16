/**
 * @license
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */
import * as posenet from '@tensorflow-models/posenet';
import * as tf from '@tensorflow/tfjs';

const color = 'aqua';
const boundingBoxColor = 'red';
let lineWidth = 8;
let circleWidth = 6;

const KeypColors = {
  'nose': 'yellow',
  'leftEye': 'red',
  'rightEye': 'blue',
  'leftEar': 'black',
  'rightEar': 'green',
  'leftShoulder': 'RosyBrown',
  'rightShoulder': 'Wheat',
  'leftElbow': 'MediumTurquoise',
  'rightElbow': 'MediumVioletRed',
  'leftWrist': 'OliveDrab',
  'rightWrist': 'OrangeRed',
  'leftHip': 'DarkKhaki',
  'rightHip': 'Maroon',
  'leftKnee': 'Teal',
  'rightKnee': 'DeepPink',
  'leftAnkle': 'DarkOrchid',
  'rightAnkle': 'Navy'
};

const segmentColors = {
  'leftElbow|leftShoulder': 'DarkSalmon', 
  'leftElbow|leftWrist': 'LIME', 
  'leftHip|leftKnee': 'Olive', 
  'leftKnee|leftAnkle': 'Sienna',
  'rightHip|rightShoulder': 'FUCHSIA', 
  'rightElbow|rightShoulder': 'SlateBlue',
  'rightElbow|rightWrist': 'Tomato',
  'rightHip|rightKnee': 'yellow',
  'leftHip|leftShoulder': 'DodgerBlue',
  'rightKnee|rightAnkle': 'MediumSeaGreen',
  'leftShoulder|rightShoulder': 'DarkMagenta',
  'leftHip|rightHip': 'DeepPink'
};


export function rescale(scale) {
  lineWidth = lineWidth/scale;
  circleWidth = circleWidth/scale;
}

function toTuple({y, x}) {
  return [y, x];
}

export function drawPoint(ctx, y, x, r, color,withCoord) {
  withCoord = false;
  ctx.beginPath();
  ctx.arc(x, y, circleWidth, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();

  if (withCoord) drawText(ctx,y,x);

}

export function drawText(ctx,y,x, color="white", font="8px Menlo Regular") {
  //ctx.moveTo(x+10,y+10);
  ctx.fillStyle = color;
  ctx.font = font;
  x = parseInt(x);
  y = parseInt(y);
  ctx.fillText("["+x+","+y+"]", x+8, y+8);
}

/**
 * Draws a line on a canvas, i.e. a joint
 */
export function drawSegment([ay, ax], [by, bx], color, scale, ctx) {
  ctx.beginPath();
  ctx.moveTo(ax * scale, ay * scale);
  ctx.lineTo(bx * scale, by * scale);
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = color;
  ctx.stroke();
}

/**
 * Draws a pose skeleton by looking up all adjacent keypoints/joints
 */
export function drawSkeleton(keypoints, minConfidence, ctx, scale = 1, withLegs=true) {
  const adjacentKeyPoints =
      posenet.getAdjacentKeyPoints(keypoints, minConfidence);
  let i = 0;
  adjacentKeyPoints.forEach((keypoints) => {
    let paintColor = segmentColors[keypoints[0].part + '|' + keypoints[1].part];

    if (!withLegs && !(keypoints[0].part=="leftKnee" || keypoints[0].part=="rightKnee" || (keypoints[0].part=="rightHip" && keypoints[1].part=="rightKnee") || (keypoints[0].part=="leftHip" && keypoints[1].part=="leftKnee")    )) {
          drawSegment(
                toTuple(keypoints[0].position), toTuple(keypoints[1].position), paintColor,
                scale, ctx);
          i++;
      } else if (withLegs) {
        drawSegment(
          toTuple(keypoints[0].position), toTuple(keypoints[1].position), paintColor,
          scale, ctx);
          i++;
      }
  });
  //console.log("segments drawn:", i);
  return i;
}

/**
 * Draw pose keypoints onto a canvas
 */
export function drawKeypoints(keypoints, minConfidence, ctx, scale = 1, withLegs=true, withCoord=false) {
  for (let i = 0; i < keypoints.length; i++) {
    const keypoint = keypoints[i];

    if (keypoint.score < minConfidence) {
      continue;
    }
    const {y, x} = keypoint.position;
    if (withLegs==false && keypoint.part!="leftKnee" && keypoint.part!="rightKnee" && keypoint.part!="leftAnkle" && keypoint.part!="rightAnkle") { 
      drawPoint(ctx, y * scale, x * scale, 4, KeypColors[keypoint.part],withCoord);
     } else if (withLegs) {
       drawPoint(ctx, y * scale, x * scale, 4, KeypColors[keypoint.part],withCoord);
    }
  }
}

/**
 * Draw the bounding box of a pose. For example, for a whole person standing
 * in an image, the bounding box will begin at the nose and extend to one of
 * ankles
 */
export function drawBoundingBox(keypoints, ctx) {
  const boundingBox = posenet.getBoundingBox(keypoints);

  ctx.rect(
      boundingBox.minX, boundingBox.minY, boundingBox.maxX - boundingBox.minX,
      boundingBox.maxY - boundingBox.minY);

  ctx.strokeStyle = boundingBoxColor;
  ctx.stroke();
}

/**
 * Converts an arary of pixel data into an ImageData object
 */
export async function renderToCanvas(a, ctx) {
  const [height, width] = a.shape;
  const imageData = new ImageData(width, height);

  const data = await a.data();

  for (let i = 0; i < height * width; ++i) {
    const j = i * 4;
    const k = i * 3;

    imageData.data[j + 0] = data[k + 0];
    imageData.data[j + 1] = data[k + 1];
    imageData.data[j + 2] = data[k + 2];
    imageData.data[j + 3] = 255;
  }

  ctx.putImageData(imageData, 0, 0);
}

/**
 * Draw an image on a canvas
 */
export function renderImageToCanvas(image, size, canvas) {
  canvas.width = size[0];
  canvas.height = size[1];
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0);
}

/**
 * Draw heatmap values, one of the model outputs, on to the canvas
 * Read our blog post for a description of PoseNet's heatmap outputs
 * https://medium.com/tensorflow/real-time-human-pose-estimation-in-the-browser-with-tensorflow-js-7dd0bc881cd5
 */
export function drawHeatMapValues(heatMapValues, outputStride, canvas) {
  const ctx = canvas.getContext('2d');
  const radius = 5;
  const scaledValues = heatMapValues.mul(tf.scalar(outputStride, 'int32'));

  drawPoints(ctx, scaledValues, radius, color);
}

/**
 * Used by the drawHeatMapValues method to draw heatmap points on to
 * the canvas
 */
function drawPoints(ctx, points, radius, color) {
  const data = points.buffer().values;

  for (let i = 0; i < data.length; i += 2) {
    const pointY = data[i];
    const pointX = data[i + 1];

    if (pointX !== 0 && pointY !== 0) {
      ctx.beginPath();
      ctx.arc(pointX, pointY, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
    }
  }
}

/**
 * Draw offset vector values, one of the model outputs, on to the canvas
 * Read our blog post for a description of PoseNet's offset vector outputs
 * https://medium.com/tensorflow/real-time-human-pose-estimation-in-the-browser-with-tensorflow-js-7dd0bc881cd5
 */
export function drawOffsetVectors(
    heatMapValues, offsets, outputStride, scale = 1, ctx) {
  const offsetPoints =
      posenet.singlePose.getOffsetPoints(heatMapValues, outputStride, offsets);

  const heatmapData = heatMapValues.buffer().values;
  const offsetPointsData = offsetPoints.buffer().values;

  for (let i = 0; i < heatmapData.length; i += 2) {
    const heatmapY = heatmapData[i] * outputStride;
    const heatmapX = heatmapData[i + 1] * outputStride;
    const offsetPointY = offsetPointsData[i];
    const offsetPointX = offsetPointsData[i + 1];

    drawSegment(
        [heatmapY, heatmapX], [offsetPointY, offsetPointX], color, scale, ctx);
  }
}
