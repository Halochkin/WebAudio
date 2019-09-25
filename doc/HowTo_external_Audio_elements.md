# HowTo: External audio element source
As mentioned earlier, you can easily play a local audio file and add your own playback settings. But what about the 
audio files on external websites? I have some good news, Web Audio API can also do that. First we have to upload the 
audio file through `XMLHttpRequest`. Remember that when you upload files using this method, your page will
 need to be maintained through the server and not just downloaded from your local file system. To avoid any 
 complications, make sure that your mp3 file is submitted in the same way and from the same location.

Here we'll look at two ways. The first is our good old friend `XMLHttpRequest()`, and the second is `fetch()`. 
The second method provides an improved interface for making requests to the server, both in terms of capabilities 
and control over what is happening, and in terms of syntax, as it is built on promises.

So, let's look at an example that does the same thing as in the previous article - make one sound in the right stereo 
(R) and the other in the left stereo (L) sound.
Let's first look at the classic `XMLHttpRequest`.
###Example: ChannelMerger (XMLHttpRequest)
```html
<audio id="player1" src="http://weblab011.com/code/riverkwai.mp3"></audio>  <!--1-->
<audio id="player2" src="http://weblab011.com/code/town.mp3"></audio>
<button onclick="playAudio()">PLAY</button>
<script>
  let audioContext;
  if (window.AudioContext)
    audioContext = new AudioContext();
  let player1 = document.getElementById('player1'), player2 = document.getElementById('player2');
  let source1 = audioContext.createMediaElementSource(player1),
    source2 = audioContext.createMediaElementSource(player2);
  let gain1 = audioContext.createGain(), gain2 = audioContext.createGain();
  let merger = audioContext.createChannelMerger();

  gain1.gain.value = 0.5; //R                                             //[1]
  gain2.gain.value = 1; //L

  source1.connect(gain1);
  source2.connect(gain2);

  gain1.connect(merger, 0, 0); //R                                        //[2]
  gain2.connect(merger, 0, 1); //L
  merger.connect(audioContext.destination);

  function playAudio() {
    audioContext.resume();
    player1.play();
    player2.play();
  }

</script>
```