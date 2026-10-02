# Music

Generated with the Gemini API (Lyria). Needs `GEMINI_API_KEY`.

    python lyria.py lyria-3-pro-preview take "<prompt>"     # -> take_0.mp3 (Lyria caps a take at about 3:00)
    python fit_music.py take_0.mp3 bed.wav 199 40           # repeat 40 beats at the most seamless point so the ending lands on the video's end
    ffmpeg -i ../girl_names_vertical.mp4 -i bed.wav -filter_complex "[1:a]loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
           -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest ../girl_names_vertical_music.mp4

To choose the repeat length, work out how many beats are needed to move the take's
musical ending to just before the video ends, rounded down to whole bars (4 beats).

Girls video prompt (both takes):

> Instrumental only, no vocals, no singing, no voice. A bright, playful, upbeat pop track for a
> short-form social video about the most popular baby girl names over 145 years. Warm and cute:
> pizzicato strings, glockenspiel, ukulele, light handclaps and finger snaps, bouncy bass, about
> 112 BPM in a major key. Steady energy throughout so it sits under on-screen text, with small
> variations every 30 seconds, a gentle build, and a clean, satisfying ending. Total length:
> 3 minutes 30 seconds (210 seconds).

- `lyria3pro_take.mp3`: Lyria 3 Pro, used in the video (40 beats repeated at 21.4 to 43.2 s)
- `lyria35_alt_take.mp3`: Lyria 3.5 alternative
