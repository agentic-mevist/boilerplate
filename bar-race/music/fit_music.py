"""Lengthen a generated music track to fit a video by repeating whole bars at the most seamless point.
usage: python fit_music.py in.mp3 out.wav <video_seconds> [repeat_beats=48]
Finds the beat grid, then picks a splice (t1 -> t0, exactly repeat_beats earlier) where the
harmony (beat-synchronous chroma) right before and after both points matches best."""
import sys, numpy as np, librosa, soundfile as sf
src, out, vid = sys.argv[1], sys.argv[2], float(sys.argv[3])
N = int(sys.argv[4]) if len(sys.argv) > 4 else 48
y, sr = librosa.load(src, sr=44100, mono=False)
mono = librosa.to_mono(y)
tempo, beats = librosa.beat.beat_track(y=mono, sr=sr, units="frames", hop_length=512)
chroma = librosa.util.sync(librosa.feature.chroma_cqt(y=mono, sr=sr, hop_length=512), beats)
chroma /= np.linalg.norm(chroma, axis=0, keepdims=True) + 1e-9
mfcc = librosa.util.sync(librosa.feature.mfcc(y=mono, sr=sr, hop_length=512, n_mfcc=13), beats)
bt = librosa.frames_to_time(beats, sr=sr, hop_length=512)
best = None
for i in range(N + 4, len(bt) - 8):
    if not (40 <= bt[i] <= bt[-1] - 50):
        continue
    j = i - N
    sim = np.mean([chroma[:, i + k] @ chroma[:, j + k] for k in range(-4, 4)])
    tim = -np.mean(np.abs(mfcc[:, i - 4:i + 4] - mfcc[:, j - 4:j + 4]))
    score = sim + 0.002 * tim
    if best is None or score > best[0]:
        best = (score, i, j)
_, i, j = best
t1, t0 = int(bt[i] * sr), int(bt[j] * sr)
xf = int(0.04 * sr)                       # 40 ms equal-power crossfade at the seam
a, b = y[:, :t1], y[:, t0:]
fade = np.linspace(0, np.pi / 2, xf)
seam = a[:, -xf:] * np.cos(fade) + b[:, :xf] * np.sin(fade)
z = np.concatenate([a[:, :-xf], seam, b[:, xf:]], axis=1)
# trim to the video: soft 1.5 s fade if the music runs past the end
L = int(vid * sr)
if z.shape[1] > L:
    z = z[:, :L]; f = int(1.5 * sr); z[:, -f:] *= np.linspace(1, 0, f)
else:
    z = np.concatenate([z, np.zeros((2, L - z.shape[1]))], axis=1)
sf.write(out, z.T, sr)
print(f"tempo {float(np.atleast_1d(tempo)[0]):.1f} bpm, repeat {bt[j]:.2f}-{bt[i]:.2f}s ({N} beats), "
      f"chroma match {best[0]:.3f}, music ends {(y.shape[1] - t0 + t1) / sr:.1f}s, video {vid:.1f}s")
