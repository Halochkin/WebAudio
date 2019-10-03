import {parse} from "./cssAudioParser.js";

function plotEnvelope(target, points) {
  target.value = 0;
  let nextStart = 0;
  for (let point of points) {
    let vol = parseFloat(point[0].num);
    let time = parseFloat(point[1].num);
    if (point[1].unit === "" || point[1].unit === "e")
      target.setTargetAtTime(vol, nextStart, time / 4);   //todo or /3? as mdn suggests
    else
      throw new Error("todo: implement 'l' or 'a' type of time coordinate.");
    nextStart += time;
  }
}

function setAudioParameter(target, param) {
  if (param === undefined) {
    return;
  } else if (param instanceof AudioNode) {
    param.connect(target);
  } else if (param.hasOwnProperty("num")) {
    //todo if the number is not parsed outside, then the units will be universal to all nodes..
    //todo I have not implemented any interpretation of "Hz" or "db" or "ms" or whatever
    target.value = parseFloat(param.num);
  } else if (param instanceof Array) {
    plotEnvelope(target, param);
    // } else if (gain instanceof undefined) { //todo should I include this??  or call it "mute"??
    //   node.gain.value = 0;
  } else
    throw new Error("CssAudio: Illegal input to gain node: " + param);
}

/**
 * AudioFileRegister caches the arrayBuffers for different audio url's.
 * This implementation is naive because it:
 * 1. doesn't handle url files that change dynamically
 * 2. stores potentially infinite audio url files directly in memory
 *
 * Can be made smarter by:
 * 1. keeping a limit on how many files are stored.
 *    If more than 100 audiofiles, or 20mb data
 *    (ie. the sum of the length/size of each arrayBuffer in the cache),
 *    then delete the cached arrayBuffer last retrieved from the cache.
 * 2. Add a static method AudioFileRegister.clearCache(url) that can be called manually from js.
 * 3. Preferably use the ttl of the http request to control the cache. If the ttl of the http request is not ok, then:
 *    a. When the file is first added to the cache register,
 *       check if trying to get the same file again returns a 304, not modified.
 *    b. if the file was not modified last time, then use the cache and check *after* the cache has been delivered
 *       if the assumption that the server returns a 304.
 *    c. check rarely if the cache needs updating, ie. after every 10n uses of the cache, ie. 1, 10, 100, 1000 etc.
 *
 * A combination of 1 and 3 should be ok.
 */
const cachedFiles = Object.create(null);
let noise;
function makeNoiseNode(duration, sampleRate) {
  const audioCtx = new OfflineAudioContext(1, sampleRate* duration, sampleRate);
  const bufferSize = sampleRate * duration; // set the time of the note
  const buffer = audioCtx.createBuffer(1, bufferSize, sampleRate); // create an empty buffer
  let data = buffer.getChannelData(0); // get data
  // fill the buffer with noise
  for (let i = 0; i < bufferSize; i++)
    data[i] = Math.random() * 2 - 1;
  return buffer;
}

class AudioFileRegister {
  static async getFileBuffer(url) {
    let cache = cachedFiles[url];
    if (!cache) {
      const file = await fetch(url);
      cache = cachedFiles[url] = await file.arrayBuffer();
    }
    return cache.slice();//att! must use .slice() to avoid depleting the ArrayBuffer
  }
  static noise(){
    return noise || (noise = makeNoiseNode(3, 44100));
  }
  //to max: it doesn't seem to matter which AudioContext makes the AudioBuffer
  //to max: this makes me think that the method .createBuffer could have been static
  //to max: but it means that the AudioBuffer objects are context free. Also for OfflineAudioContexts.
}

class InterpreterFunctions {

  static sine(ctx, freq) {
    return InterpreterFunctions.makeOscillator(ctx, "sine", freq);
  }

  static square(ctx, freq) {
    return InterpreterFunctions.makeOscillator(ctx, "square", freq);
  }

  static sawtooth(ctx, freq) {
    return InterpreterFunctions.makeOscillator(ctx, "sawtooth", freq);
  }

  static triangle(ctx, freq) {
    return InterpreterFunctions.makeOscillator(ctx, "triangle", freq);
  }

  static gain(ctx, gainParam) {
    const node = ctx.createGain();
    setAudioParameter(node.gain, gainParam);
    return node;
  }

  static makeOscillator(audioContext, type, freq) {
    //todo convert the factory methods to constructors as specified by MDN
    const oscillator = audioContext.createOscillator();
    oscillator.type = type;
    setAudioParameter(oscillator.frequency, freq);
    // oscillator.frequency.value = parseFloat(freq);
    oscillator.start();
    return oscillator;
  }

  static lowpass(ctx, freq, q, detune) {
    return InterpreterFunctions.makeFilter(ctx, "lowpass", {freq, q, detune});
  }

  static highpass(ctx, freq, q, detune) {
    return InterpreterFunctions.makeFilter(ctx, "highpass", {freq, q, detune});
  }

  static bandpass(ctx, freq, q, detune) {
    return InterpreterFunctions.makeFilter(ctx, "bandpass", {freq, q, detune});
  }

  static lowshelf(ctx, freq, gain, detune) {
    return InterpreterFunctions.makeFilter(ctx, "lowshelf", {freq, gain, detune});
  }

  static highshelf(ctx, freq, gain, detune) {
    return InterpreterFunctions.makeFilter(ctx, "highshelf", {freq, gain, detune});
  }

  static peaking(ctx, freq, q, gain, detune) {
    return InterpreterFunctions.makeFilter(ctx, "peaking", {freq, q, gain, detune});
  }

  static notch(ctx, freq, q, detune) {
    return InterpreterFunctions.makeFilter(ctx, "notch", {freq, q, detune});
  }

  static allpass(ctx, freq, q, detune) {
    return InterpreterFunctions.makeFilter(ctx, "allpass", {freq, q, detune});
  }

  static makeFilter(audioContext, type, p) {
    //todo factory vs constructor: https://developer.mozilla.org/en-US/docs/Web/API/AudioNode#Creating_an_AudioNode
    //todo the problem is that this is difficult to do if the parameter is an audio envelope represented as an array.
    const filterNode = audioContext.createBiquadFilter();
    filterNode.type = type;
    setAudioParameter(filterNode.frequency, p.freq);
    setAudioParameter(filterNode.Q, p.q);
    setAudioParameter(filterNode.gain, p.gain);
    setAudioParameter(filterNode.detune, p.detune);
    return filterNode;
  }

  static async url(audioCtx, url) {
    const data = await AudioFileRegister.getFileBuffer(url);
    const bufferSource = audioCtx.createBufferSource();
    bufferSource.buffer = await audioCtx.decodeAudioData(data);
    bufferSource.start();
    return bufferSource;
  }

  static async noise(audioCtx) {
    const noise = audioCtx.createBufferSource();
    noise.buffer = AudioFileRegister.noise();
    noise.loop = true;
    noise.start();
    return noise;
  }
}

class CssAudioInterpreterContext {

  static connectMtoN(m, n) {
    for (let a of m) {
      for (let b of n) {
        if (!a instanceof AudioNode)
          throw new SyntaxError("CssAudioNode cannot be: " + a);
        if (!b instanceof AudioNode)
          throw new SyntaxError("CssAudioNode cannot be: " + b);
        a.connect(b);
        //todo calling start inside all source nodes now, as the ctx passed in is suspended before being populated.
        // let inputs = b.inputs || (b.inputs = []);
        // inputs.push(a);
      }
    }
  }

  static async interpretPipe(ctx, pipe) {
    const nodes = [];
    for (let node of pipe.nodes) {
      node = await CssAudioInterpreterContext.interpretNode(ctx, node);
      node = node instanceof Array ? node : [node];
      nodes.push(node);
    }
    for (let i = 0; i < nodes.length - 1; i++)
      CssAudioInterpreterContext.connectMtoN(nodes[i], nodes[i + 1]);
    return nodes.pop();
  }

  /**
   * todo 0. Reuse the propcessing. To do that we need to analyze it into an ArrayBuffer. That can be reused.
   * todo    But, to convert it into an ArrayBuffer, we need to know when the sound is off.. To know that, we either
   * todo    need to have a "off(endtime)", or analyze a "gain()" expression, in the main pipe, verify that no source
   * todo    nodes are added after it, and check if it ends with 0 (which only can be done in an envelope or a fixed
   * todo    value), and then calculate the duration of the gain with sound. then summarize the duration of that gain.
   * todo
   * todo max. can we use offlineAudioCtx to make an ArrayBuffer of a sound, to make it faster to play back?
   * todo a. make this recursive instead? first pipe, then array, then node, then argument? but I don't need argument, as it has already been processed?
   *
   * @param node
   * @returns {Promise.<*>}
   */
  static async interpretNode(ctx, node) {
    if (node.type === "pipe")
      return await CssAudioInterpreterContext.interpretPipe(ctx, node);
    if (node instanceof Array) {
      const res = [];
      for (let item of node) {
        item = await CssAudioInterpreterContext.interpretNode(ctx, item);
        res.push(item);
      }
      return res;
    }
    if (node.type === "fun") {
      const args = [];
      for (let item of node.args) {
        item = await CssAudioInterpreterContext.interpretNode(ctx, item);
        args.push(item);
      }
      return await CssAudioInterpreterContext.makeNode(ctx, node.name, args);
    }
    if (node.hasOwnProperty("num")) {
      return node;
    }
    if (typeof node === "string")
      return await CssAudioInterpreterContext.makeNode(ctx, node);
    throw new Error("omg? wtf? " + node)
  }

  static async makeNode(ctx, name, args) {
    if (!InterpreterFunctions[name])
      return name;
    if (!args)
      return await InterpreterFunctions[name](ctx);
    return await InterpreterFunctions[name](ctx, ...args);
  }
}

export async function interpret(str) {
  const ast = parse(str);
  const ctx = new AudioContext();
  ctx.suspend();
  const audioNodes = await CssAudioInterpreterContext.interpretPipe(ctx, ast);
  CssAudioInterpreterContext.connectMtoN(audioNodes, [ctx.destination]);
  return ctx;
}