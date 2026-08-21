interface ClipThumbnailStripProps {
  clipId: string;
  thumbnails: string[];
  trimStart: number;
  trimEnd: number;
}

export const ClipThumbnailStrip = ({ clipId, thumbnails, trimStart, trimEnd }: ClipThumbnailStripProps) => {
  if (thumbnails.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-70">
      <div className="flex h-full" style={{ width: `${100 / (trimEnd - trimStart)}%`, transform: `translateX(-${trimStart * 100}%)` }}>
        {thumbnails.map((thumbnail, index) => (
          <img key={`${clipId}-thumbnail-${index}`} src={thumbnail} alt="" className="h-full min-w-0 flex-1 object-cover" />
        ))}
      </div>
    </div>
  );
};
