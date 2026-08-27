# Manual Browser Smoke Testing

## Purpose

Manual smoke testing verifies real runtime behavior in an actual browser environment. Automated tests cannot replace this — they verify contracts and logic but not visual rendering, playback stability, or user interaction quality.

## Principle

> Automated tests verify contracts, logic and regressions.
> Manual smoke testing verifies real runtime behavior.
> Neither replaces the other.

The checklist should not claim that a feature passes merely because automated tests pass.

## Desktop Checklist

### Import & Project
- [ ] Import media file (video, audio, image)
- [ ] Media API discovers all imported assets
- [ ] Project persistence (save/load)

### Timeline
- [ ] Clip placement on timeline
- [ ] Clip duration increase — following clips pushed (no overlap)
- [ ] Clip duration decrease — following clips pulled
- [ ] Clip resize (trim) from handles
- [ ] Drag to reorder clips
- [ ] Undo / redo operations

### Transitions
- [ ] Push transition preview (no black frames)
- [ ] Slide transition preview (no black frames)
- [ ] Fade transition preview
- [ ] Final render produces correct transitions

### Playback
- [ ] Normal playback at 30 FPS (no shuttering)
- [ ] Normal playback at 60 FPS (no shuttering)
- [ ] Pause / resume
- [ ] Seek (drag playhead)
- [ ] Keyframe seek
- [ ] Full video render preview
- [ ] Selected keyframe render preview

### Speed
- [ ] Video speed change — playback visibly faster/slower
- [ ] Audio speed change — playback visibly faster/slower
- [ ] Speed slider in properties panel reflects value

### Properties
- [ ] Audio volume
- [ ] Audio fade in/out
- [ ] Video fade in/out
- [ ] Transform (position)
- [ ] Scale
- [ ] Opacity
- [ ] Fill
- [ ] Layout/center

### Text
- [ ] Standard text layout — positioned correctly relative to frame
- [ ] Text fade in/out
- [ ] Text color
- [ ] Font size
- [ ] Text alignment (left/center/right)

### Tracks
- [ ] Track lock (prevents edits)
- [ ] Track volume
- [ ] Track show/hide

### Plugins
- [ ] Plugin marketplace opens
- [ ] Plugin translations display correctly (no raw keys)
- [ ] Plugin tab renders

### Auto Captions
- [ ] Plugin discovers media assets
- [ ] Plugin recognizes transcribable video/audio
- [ ] Generate button triggers real processing
- [ ] Server receives media and processes with Whisper
- [ ] Caption clips appear on timeline with correct timing

### Export
- [ ] Export translations display correctly
- [ ] Export initiates successfully
- [ ] Render produces correct video output

## Mobile Checklist

### Sheets & Navigation
- [ ] Media sheet opens and lists assets
- [ ] Transitions sheet shows available transitions
- [ ] Text sheet shows text creation options
- [ ] Tracks sheet shows track management
- [ ] Exports sheet shows recent exports
- [ ] Audio mixer sheet
- [ ] Plugins sheet
- [ ] Tools sheet

### Translation
- [ ] All sheet titles resolve correctly (no raw keys)
- [ ] Frame counter displays: `Frame: X / Y`
- [ ] Settings label resolves

### Controls
- [ ] Play/pause
- [ ] Seek slider
- [ ] Split clip
- [ ] Undo/redo
- [ ] Save

## Juicer Checklist

### Input
- [ ] Attach files
- [ ] Enter prompt
- [ ] Select language/model

### Processing
- [ ] Planning generates real AI response
- [ ] Plan shows operations
- [ ] Clarification flow works

### Execution
- [ ] Operations execute on timeline
- [ ] Clips placed at correct positions
- [ ] Subtitles/text clips created
- [ ] Transitions applied

### Playback After Juicer
- [ ] Video clips play (not frozen single-frame)
- [ ] Audio plays correctly
- [ ] Undo restores previous state

### Rendering
- [ ] Final render produces correct video
- [ ] Audio renders correctly
- [ ] Transitions render correctly

## Verification Notes

- Check browser console for runtime errors during all tests
- Verify at both 30 FPS and 60 FPS project settings
- Test with multiple video formats (MP4, WebM)
- Test with mixed media types in the same project
