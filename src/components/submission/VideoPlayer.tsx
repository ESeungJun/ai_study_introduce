"use client";

import { useEffect, useRef } from "react";

interface Props {
  url: string;
}

function isYouTube(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be");
}

function getYouTubeId(url: string) {
  const match = url.match(/(?:v=|youtu\.be\/)([^&?/]+)/);
  return match?.[1] ?? null;
}

export default function VideoPlayer({ url }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [url]);

  if (isYouTube(url)) {
    const videoId = getYouTubeId(url);
    return (
      <div className="aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}`}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        preload="metadata"
      >
        <source src={url} />
        영상을 재생할 수 없습니다.
      </video>
    </div>
  );
}
