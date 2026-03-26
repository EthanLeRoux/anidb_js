import React, { useEffect, useState, useRef } from "react";

export default function VideoPlayer({ videoId }) {
  const [videoData, setVideoData] = useState(null);
  const [subtitles, setSubtitles] = useState([]);
  const videoRef = useRef();

  const API_URL = import.meta.env.VITE_REACT_APP_API_URL || ""; // fallback to same origin

  // ── Fetch video metadata ────────────────────────────────
  useEffect(() => {
    async function fetchVideo() {
      try {
        const res = await fetch(`${API_URL}/api/videos/${videoId}`);
        const data = await res.json();
        setVideoData(data);

        // fetch default subtitles for the song
        const subsRes = await fetch(
          `${API_URL}/api/subtitles?song=${data.song._id}&is_default=true`
        );
        const subsData = await subsRes.json();
        setSubtitles(subsData.lines || []);
      } catch (e) {
        console.error(e);
      }
    }

    fetchVideo();
  }, [videoId, API_URL]);

  // ── Convert subtitle JSON to VTT text ───────────────────
  const generateVTT = (lines) => {
    const vtt = ["WEBVTT\n"];
    lines.forEach((line, idx) => {
      const start = formatTime(line.start);
      const end = formatTime(line.end);
      vtt.push(`${idx + 1}\n${start} --> ${end}\n${line.text}\n`);
    });
    return vtt.join("\n");
  };

  // ── Format seconds to HH:MM:SS.mmm ────────────────────
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600)
      .toString()
      .padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60)
      .toString()
      .padStart(2, "0");
    const s = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    const ms = Math.floor((seconds % 1) * 1000)
      .toString()
      .padStart(3, "0");
    return `${h}:${m}:${s}.${ms}`;
  };

  // ── Create Blob URL for VTT track ──────────────────────
  const vttUrl = subtitles.length
    ? URL.createObjectURL(
        new Blob([generateVTT(subtitles)], { type: "text/vtt" })
      )
    : null;

  if (!videoData) return <p>Loading video...</p>;

  return (
    <div>
      <video ref={videoRef} controls width="800" poster={videoData.cover_url}>
        <source src={videoData.mega_url} type={`video/${videoData.format}`} />
        {vttUrl && (
          <track
            src={vttUrl}
            kind="subtitles"
            srcLang={videoData.language || "ja"}
            label="JP"
            default
          />
        )}
        Your browser does not support HTML5 video.
      </video>
      <h3>{videoData.song.title}</h3>
      <p>{videoData.song.anime.title_en || videoData.song.anime.title}</p>
    </div>
  );
}
