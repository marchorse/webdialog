var recLength = 0,
  recBuffersL = [],
  recBuffersR = [],
  sampleRate;
  
downSampleFactor = 2;


this.onmessage = function(e){
  switch(e.data.command){
    case 'init':
      init(e.data.config);
      break;
    case 'record':
      record(e.data.buffer);
      break;
    case 'exportWAV':
      exportWAV(e.data.type);
      break;
    case 'getBuffer':
      getBuffer();
      break;
    case 'clear':
      clear();
      break;
  }
};

function init(config){
  sampleRate = config.sampleRate;
}

function record(inputBuffer){
  recBuffersL.push(inputBuffer[0]);
  recBuffersR.push(inputBuffer[1]);
  recLength += inputBuffer[0].length;
}

function exportWAV(type){
  var bufferL = mergeBuffers(recBuffersL, recLength);
  var bufferR = mergeBuffers(recBuffersR, recLength);
  //var interleaved = interleave(bufferL, bufferR);
  var mean = maxclip(meanLR(bufferL, bufferR),60);
  //var dataview = encodeWAV(interleaved);
  var dataview;
  if (downSampleFactor>1) {
    dataview = encodeWAV(downSample(mean, downSampleFactor));
  } else {
    dataview = encodeWAV(mean);
  }
   
  
  var audioBlob = new Blob([dataview], { type: type });

  this.postMessage(audioBlob);
}

function maxclip(input, seconds) {
  // force the buffer input to be at most s seconds long
  var max_frames = seconds * sampleRate;
  if (input.length > max_frames) {
    // clip
    var result = new Float32Array(max_frames);
    for (i=0; i<max_frames; i++) {
      result[i] = input[input.length-max_frames+i-1];
    }
    return result;
  } else {
    // no need to clip
    return input;
  }
}

function downSample(input, downSampleFactor) {
  var length = Math.round(input.length / downSampleFactor);
  var result = new Float32Array(length);

  for (var i = 0; i < length; i++){
    result[i] = input[i * downSampleFactor];
  }
  return result;
}

function getBuffer() {
  var buffers = [];
  buffers.push( mergeBuffers(recBuffersL, recLength) );
  buffers.push( mergeBuffers(recBuffersR, recLength) );
  this.postMessage(buffers);
}

function clear(){
  recLength = 0;
  recBuffersL = [];
  recBuffersR = [];
}

function mergeBuffers(recBuffers, recLength){
  var result = new Float32Array(recLength);
  var offset = 0;
  for (var i = 0; i < recBuffers.length; i++){
    result.set(recBuffers[i], offset);
    offset += recBuffers[i].length;
  }
  return result;
}

function interleave(inputL, inputR){
  var length = inputL.length + inputR.length;
  var result = new Float32Array(length);

  var index = 0,
    inputIndex = 0;

  while (index < length){
    result[index++] = inputL[inputIndex];
    result[index++] = inputR[inputIndex];
    inputIndex++;
  }
  return result;
}

function meanLR(input1, input2) {
  var length = input1.length;
  var result = new Float32Array(length);

  var index = 0;
  while (index < length){
    result[index++] = (input1[index] + input2[index])/2;
  }
  return result;
}


function floatTo16BitPCM(output, offset, input){
  for (var i = 0; i < input.length; i++, offset+=2){
    var s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
}

function writeString(view, offset, string){
  for (var i = 0; i < string.length; i++){
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

function encodeWAV(samples){
  
  var buffer = new ArrayBuffer(44 + samples.length * 2);
  var view = new DataView(buffer);
  /* RIFF identifier */
  writeString(view, 0, 'RIFF');
  /* file length */
  view.setUint32(4, 32 + samples.length * 2, true);
  /* RIFF type */
  writeString(view, 8, 'WAVE');
  /* format chunk identifier */
  writeString(view, 12, 'fmt ');
  /* format chunk length */
  view.setUint32(16, 16, true);
  /* sample format (raw) */
  view.setUint16(20, 1, true);
  /* channel count */
  //view.setUint16(22, 2, true);
  view.setUint16(22, 1, true);
  /* sample rate */
  view.setUint32(24, sampleRate/downSampleFactor, true);
  /* byte rate (sample rate * block align) */
//  view.setUint32(28, sampleRate * 4, true);
  view.setUint32(28, (sampleRate/downSampleFactor) * 2, true);
  /* block align (channel count * bytes per sample) */
  //view.setUint16(32, 4, true);
  view.setUint16(32, 2, true);
  /* bits per sample */
  view.setUint16(34, 16, true);
  /* data chunk identifier */
  writeString(view, 36, 'data');
  /* data chunk length */
  view.setUint32(40, samples.length * 2, true);

  floatTo16BitPCM(view, 44, samples);

  return view;
}