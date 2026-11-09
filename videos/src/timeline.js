window.TL={
 "total": 334.814,
 "scenes": [
  {
   "id": "title",
   "start": 0.0,
   "beats": [
    {
     "t": 0.6,
     "d": 2.348,
     "text": "Everyone says Claude edits videos now."
    },
    {
     "t": 3.298,
     "d": 4.978,
     "text": "But what actually happens when you hand it a video? Let's open the hood, in plain words."
    }
   ],
   "end": 8.725833000000002
  },
  {
   "id": "big",
   "start": 8.725833000000002,
   "beats": [
    {
     "t": 9.176,
     "d": 6.713,
     "text": "Every AI editor, from a Claude Code recipe to a polished app, is the same five boxes."
    },
    {
     "t": 16.239,
     "d": 1.022,
     "text": "Your video."
    },
    {
     "t": 17.611,
     "d": 2.966,
     "text": "Senses, which turn the footage into text."
    },
    {
     "t": 20.927,
     "d": 4.647,
     "text": "A brain, the language model, which reads that text and decides the cuts."
    },
    {
     "t": 25.924,
     "d": 3.339,
     "text": "A recipe: a tiny text file listing what to keep."
    },
    {
     "t": 29.613,
     "d": 4.444,
     "text": "And a kitchen, a tool called ffmpeg, that cooks the final video."
    },
    {
     "t": 34.406,
     "d": 3.549,
     "text": "Then you watch it, give feedback, and the loop goes around again."
    }
   ],
   "end": 38.40487399999999
  },
  {
   "id": "harness",
   "start": 38.40487399999999,
   "beats": [
    {
     "t": 38.855,
     "d": 3.929,
     "text": "First, a surprise: Claude never watches your video."
    },
    {
     "t": 43.133,
     "d": 7.038,
     "text": "There are two separate pieces. The model lives in Anthropic's data center. It only reads text, and the occasional picture."
    },
    {
     "t": 50.521,
     "d": 6.29,
     "text": "The harness, Claude Code, is a normal program on your laptop. It can run commands and touch files."
    },
    {
     "t": 57.161,
     "d": 5.471,
     "text": "So your four gigabyte video never leaves your computer. What travels is a description of it."
    }
   ],
   "end": 63.08233199999999
  },
  {
   "id": "loop",
   "start": 63.08233199999999,
   "beats": [
    {
     "t": 63.532,
     "d": 5.724,
     "text": "The harness runs a loop. It sends the model your request, plus everything that has happened so far."
    },
    {
     "t": 69.606,
     "d": 3.77,
     "text": "The model picks one next step. Say, transcribe the audio."
    },
    {
     "t": 73.726,
     "d": 1.921,
     "text": "The harness runs it on your computer."
    },
    {
     "t": 75.997,
     "d": 2.883,
     "text": "And the result goes back into the conversation."
    },
    {
     "t": 79.231,
     "d": 8.494,
     "text": "Repeat, dozens of times, until the model says done. There's no master plan, which is why the same request can turn out differently each time."
    }
   ],
   "end": 88.17474699999998
  },
  {
   "id": "steps",
   "start": 88.17474699999998,
   "beats": [
    {
     "t": 88.625,
     "d": 2.664,
     "text": "Here's a typical edit. Inspect the file."
    },
    {
     "t": 91.639,
     "d": 1.119,
     "text": "Pull out the audio."
    },
    {
     "t": 93.108,
     "d": 3.774,
     "text": "Transcribe every word, with its exact start and end time."
    },
    {
     "t": 97.232,
     "d": 5.465,
     "text": "Read the transcript, and spot the retakes, pauses and filler words."
    },
    {
     "t": 103.047,
     "d": 2.318,
     "text": "Write down which time ranges to keep."
    },
    {
     "t": 105.716,
     "d": 6.0,
     "text": "Then ffmpeg cuts, joins, adds captions, and renders a brand new file in your folder."
    }
   ],
   "end": 112.16616299999997
  },
  {
   "id": "cutlist",
   "start": 112.16616299999997,
   "beats": [
    {
     "t": 112.616,
     "d": 1.769,
     "text": "This is the key idea."
    },
    {
     "t": 114.735,
     "d": 4.532,
     "text": "To a language model, editing means reading words that carry timestamps,"
    },
    {
     "t": 119.617,
     "d": 1.704,
     "text": "crossing some of them out,"
    },
    {
     "t": 121.671,
     "d": 6.712,
     "text": "and writing the kept ranges down. That little text file is the edit. The model never moves a single pixel."
    }
   ],
   "end": 128.832996
  },
  {
   "id": "challenges",
   "start": 128.832996,
   "beats": [
    {
     "t": 129.283,
     "d": 1.608,
     "text": "And that's also where it breaks."
    },
    {
     "t": 131.241,
     "d": 5.295,
     "text": "It's blind and deaf. It only knows what the text and a few still frames tell it."
    },
    {
     "t": 136.886,
     "d": 4.751,
     "text": "Transcript timings are often a tenth of a second off, so cuts chop the start of words."
    },
    {
     "t": 141.987,
     "d": 2.99,
     "text": "Every small fix re-renders the whole video."
    },
    {
     "t": 145.327,
     "d": 3.362,
     "text": "There's no timeline you can grab and drag."
    },
    {
     "t": 149.039,
     "d": 2.462,
     "text": "And it often says done when it isn't."
    }
   ],
   "end": 151.950828
  },
  {
   "id": "codec",
   "start": 151.950828,
   "beats": [
    {
     "t": 152.401,
     "d": 2.711,
     "text": "Quick detour. What is a video file?"
    },
    {
     "t": 155.462,
     "d": 6.06,
     "text": "It's a box, called the container, holding a picture track and a sound track. Each one is squeezed by a codec."
    },
    {
     "t": 161.872,
     "d": 6.932,
     "text": "Uncompressed, one minute of 1080p is about eleven gigabytes. Compressed, about sixty megabytes."
    },
    {
     "t": 169.155,
     "d": 6.325,
     "text": "The trick: store one full picture, called a keyframe, then only tiny notes about what changed."
    },
    {
     "t": 175.83,
     "d": 9.046,
     "text": "Small files. But cut between keyframes, and the computer has to rebuild those frames. That's re-encoding, and it's where render time goes."
    }
   ],
   "end": 185.325661
  },
  {
   "id": "proxy",
   "start": 185.325661,
   "beats": [
    {
     "t": 185.776,
     "d": 5.195,
     "text": "So professional editors use proxies: a small, low resolution copy of the video."
    },
    {
     "t": 191.321,
     "d": 3.801,
     "text": "You analyse, preview and decide using the light copy."
    },
    {
     "t": 195.471,
     "d": 6.983,
     "text": "Because the timings are identical, every decision applies to the original, which only gets touched once, for the final render."
    },
    {
     "t": 202.805,
     "d": 4.024,
     "text": "It's also what you should send to Gemini, which shrinks every frame anyway."
    }
   ],
   "end": 207.278952
  },
  {
   "id": "senses",
   "start": 207.278952,
   "beats": [
    {
     "t": 207.729,
     "d": 7.997,
     "text": "Now, how do we help a blind model perceive a video? With senses: small, specialised tools. Not big AI."
    },
    {
     "t": 216.076,
     "d": 1.851,
     "text": "Transcription, for the words."
    },
    {
     "t": 218.277,
     "d": 3.617,
     "text": "Voice activity detection, for speech versus silence."
    },
    {
     "t": 222.244,
     "d": 3.301,
     "text": "Filler detection, for the ums and uhs."
    },
    {
     "t": 225.895,
     "d": 3.023,
     "text": "Diarization, for who is speaking."
    },
    {
     "t": 229.268,
     "d": 2.328,
     "text": "Shot detection, for where the camera changes."
    },
    {
     "t": 231.946,
     "d": 1.993,
     "text": "Face tracking, for where you are in the frame."
    },
    {
     "t": 234.289,
     "d": 2.3,
     "text": "Visual captions, for what's on screen."
    },
    {
     "t": 236.939,
     "d": 5.336,
     "text": "And embeddings: a meaning fingerprint, so you can search your footage for typing on a laptop."
    },
    {
     "t": 242.625,
     "d": 5.892,
     "text": "Line them all up on one timeline, turn them into text, and that's the dossier the model actually reads."
    }
   ],
   "end": 248.96732699999998
  },
  {
   "id": "recipe",
   "start": 248.96732699999998,
   "beats": [
    {
     "t": 249.417,
     "d": 6.291,
     "text": "The edit itself should live as a recipe, written in JSON. That's just plain text with names and values."
    },
    {
     "t": 256.059,
     "d": 10.29,
     "text": "Play raw dot mp4 from zero to point four five seconds. Then from seven point nine five. Zoom in fifteen percent. Add captions. Lower the music under the voice."
    },
    {
     "t": 266.699,
     "d": 3.306,
     "text": "No pixels at all. That recipe is the source of truth."
    },
    {
     "t": 270.355,
     "d": 5.145,
     "text": "You edit it. Claude edits it. The player reads it. The renderer cooks from it."
    }
   ],
   "end": 275.949618
  },
  {
   "id": "preview",
   "start": 275.949618,
   "beats": [
    {
     "t": 276.4,
     "d": 3.192,
     "text": "Which means you don't have to wait for a render to see the edit."
    },
    {
     "t": 279.942,
     "d": 5.899,
     "text": "Rendering everything first takes minutes. Streaming chunks as they finish takes seconds."
    },
    {
     "t": 286.191,
     "d": 4.751,
     "text": "But a player can simply follow the recipe live, straight from the proxies. Instantly."
    },
    {
     "t": 291.292,
     "d": 5.505,
     "text": "And you could watch the timeline change as Claude works, and grab a cut the moment it gets one wrong."
    }
   ],
   "end": 297.24691
  },
  {
   "id": "app",
   "start": 297.24691,
   "beats": [
    {
     "t": 297.697,
     "d": 2.331,
     "text": "Put it all together, and here's an app idea."
    },
    {
     "t": 300.378,
     "d": 8.987,
     "text": "A native Mac app that is the eyes, the hands and the screen. It makes proxies, runs the senses on the device, holds the recipe, and plays it live."
    },
    {
     "t": 309.715,
     "d": 7.301,
     "text": "Claude Code or Codex plugs in through a local MCP server, as the brain, on the user's own subscription."
    },
    {
     "t": 317.366,
     "d": 4.425,
     "text": "And rules like never cut inside a word become code, instead of hope."
    }
   ],
   "end": 322.240785
  },
  {
   "id": "outro",
   "start": 322.240785,
   "beats": [
    {
     "t": 322.691,
     "d": 3.803,
     "text": "So: Claude doesn't watch your video. It reads it."
    },
    {
     "t": 326.843,
     "d": 6.271,
     "text": "The better we describe the footage, and the more of the boring rules we turn into code, the better the edit gets."
    }
   ],
   "end": 334.81441
  }
 ]
};
