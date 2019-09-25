# WhatIs: Web audio Api

Web Audio API is a high-level way to create and manage sound directly in a browser using JavaScript. 
It allows you to generate sound from scratch or to download and manipulate any existing audio file you may have. 
It's extremely powerful, even with its own synchronization system for playback per second.

### How to start?
To start working with the `Web audio Api`, we need to make sure that we are using a browser that supports it. 
```javascript
if (window.AudioContext) {
   // amazing stuff here
}else{
  alert("Your browser does not support Web audio api");
}
```
### Main components
#### 1. AudioContext
  `AudioContext` interface is the basis of `Web Audio`, it provides the necessary functions for the creation of various 
  elements of Web Audio and a way to transmit sound to "hardware" and audio output devices.
  It might be useful to present `AudioContext` as a kind of DJ: it coordinates the collection of audio 
  sources and ensures that the sources will be played through the user's speakers at the right time and with the right
   "sound". And as a DJ, we can think of audioContext as an intermediary between the sound sources and the "sound system", 
   the sound equipment of the host machine. Here are a few more things to keep in mind when working with AudioContext:
  * AudioContext is the leading "temporary keeper". All signals should be scheduled relative to audioContext.currentTime.
  * AudioContext instances can create audio sources from scratch.
  
  ```javascript
var audioContext = null
 
if (window.AudioContext) {
    audioContext = new AudioContext();
}
```
#### 2. Oscillator
An oscillator is a type of sound generator that provides us with a simple tone.  To find out what sounds it can generate 
itself, let's use audioContext to create OscillatorNode:
But in order to produce sound, it must be connected to our speakers, otherwise known in the field of web audio as `audioContext.destination`.
```javascript
const oscillator = audioContext.createOscillator();
oscillator.connect(audioContext.destination);
```
The Web Audio API tries to simulate an analogue signal chain. We connect our input signal (`oscillator`) to a digital power
 amplifier (`audioContext`), which then transmits the signal to the speakers.

Now that everything's connected, we just need to start the generator so we can hear it. Make sure that the speakers are not too loud!
```javascript
oscillator.start(context.currentTime)
```

You should hear a sound comparable to a beep. Congratulations, you create music using the Web Audio API! Of course,
 nobody wants to hear the same sound. You can stop our generator this way:
 ```javascript
 oscillator.stop(context.currentTime)
 ```
 > Once AudioNode is stopped, it cannot be run again! A new AudioNode must be created to resume playback.
 
Both `start()` and `stop()` take one parameter of the number type. The parameter value is used to schedule start/stop events:

```javascript
// Play the sound in 5 seconds
oscillator.start(audioContext.currentTime + 5);

// Mute after 5 seconds 
oscillator.stop(audioContext.currentTime + 15);
```
The signal will start after 5 seconds, play for 10 seconds, and then stop relative to `audioContext.currentTime`

> Note that when you add a delay, the number `15` in `stop()` indicates the time that the signal will turn off, relative to 
the start, and that the signal will last for 10 seconds.

By defining oscillator, we get something like this (specific property values are omitted as they may vary depending on the device / browser):
```javascript
console.log(oscillator);
/*
  {
    channelCount: number,
    context: AudioContext,
    detune: AudioParam,
    type: 'sine' | 'sawtooth' | 'triangle' | 'square'
    frequency: AudioParam,
    numberOfInputs: number,
    numberOfOutputs: number,
    onended: function
    ...
  }
*/
```
The property that matters most to our purposes is `oscillator.frequency`. It representing the frequency of oscillation in hertz.

For example note `B4` have `493.88` frequency. Below are the values of some notes.

| note | Frequency (Hz)|
| ---|:----:| 
|A4|	440.00|
|B4 |	493.88|
|C5	|493.88|
|..|...|
####  Periodic signal shaping
Our oscillator uses a periodic signal to emit its tone. The waveform is represented by the OscillatorNode interface 
type property. The default type is "sine". Most browsers support at least three other options: "sawtooth", "triangle"
 and "square". Thus, changing the "tone" of our generator is as simple as changing it:
```javascript
oscillator.type = 'triangle';
```
#### 3. Volume control
 To control the volume, you need to create another `GainNode` object.
 ```javascript
const myGain = audioContext.createGain();
```
For gainNode it is also necessary to connect audioContext.destination
```javascript
myGain.connect(audioContext.destination);
```
 The volume will change as follows: 
 ```javascript
 myGain.gain.value = value;
  ```
  Where the value should be between 0 (silence) and 1 (full volume).
 Actually, you can try to set a value greater than 1, which should give an override, but it doesn't work everywhere.
 You can change it both before starting the sound for playback and during playback.
 
#### Example: Dynamic gain
```html
<input type="range" value="0.5" min="0" max="1" step="0.1">
<button onclick="playSound();">Play</button>
<button onclick="stopSound();">Stop</button>

<script>
  let audioContext;                                                          //[1]
  let input = document.querySelector("input");

  if (window.AudioContext)
    audioContext = new AudioContext();                                       //[1]

  let oscillator = audioContext.createOscillator();
  let gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(input.value, audioContext.currentTime);       //[2]
  gainNode.connect(audioContext.destination);                                //[3]
  oscillator.connect(gainNode);                                              //[4]

  function playSound() {
    oscillator.start(audioContext.currentTime);                              //[5]
  }

  function stopSound() {
    oscillator.stop(audioContext.currentTime);                               //[6]
  }

  input.addEventListener("input", (e) => {
    gainNode.gain.setValueAtTime(e.target.value, audioContext.currentTime);  //[7]
  });
</script>
```
try in on [codepen.io](https://codepen.io/Halochkin/pen/joobwb?editors=1010);
***
1. Define audioContext.
2. Set gain level, from input default value.
3. Connect destination to the gain. Take note that we can connect only one destination.
4. Connect gainNode to the oscillator, to ensure that the sound level can be changed.
5. Start playing sound after clicking `Start` button. Remember that the oscillator can only be played once.
6. You will not be able to reactivate it after pressing the `Stop` button.
7. Change of gain property immediately after event activation. Remember that here you can add a delay.

### Reference

* [MDN: Web Audio Api](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API);
* [MDN: Audio Context](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext);
* [MDN: OscillatorNode](https://developer.mozilla.org/en-US/docs/Web/API/OscillatorNode)
* [Notes frequency](http://pages.mtu.edu/~suits/notefreqs.html);
