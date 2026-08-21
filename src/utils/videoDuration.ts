const FPS = 30;

export const detectTrueVideoDuration = (blob: Blob, fps: number = FPS): Promise<number> =>
  new Promise((resolve) => {
    const video = document.createElement('video');
    video.preload = 'auto';
    video.muted = true;
    video.playsInline = true;
    const url = URL.createObjectURL(blob);
    let settled = false;
    const finish = (frames: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      video.removeAttribute('src');
      video.load();
      URL.revokeObjectURL(url);
      resolve(frames);
    };

    const timeout = setTimeout(() => {
      // Fallback: use whatever duration metadata reports (may be wrong)
      const dur = video.duration && isFinite(video.duration) && video.duration > 0
        ? Math.max(1, Math.round(video.duration * fps))
        : 1;
      finish(dur);
    }, 15_000);

    video.onloadedmetadata = () => {
      // Many large files report wrong/short duration in metadata.
      // Force a seek to the end to make browser parse the real duration.
      try {
        video.currentTime = 1e9;
      } catch {
        // ignore, fallback timeout will handle
      }
    };
    video.onseeked = () => {
      const dur = video.duration;
      if (dur && isFinite(dur) && dur > 0) {
        finish(Math.max(1, Math.round(dur * fps)));
      }
    };
    video.onerror = () => finish(1);
    try {
      video.src = url;
    } catch {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(1);
    }
  });
