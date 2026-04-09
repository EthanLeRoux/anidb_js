/* eslint-disable react/prop-types */

export default function VideoPlayer({ streamUrl, poster }) {
  if (!streamUrl) {
    return <p className="muted">No video available for this song.</p>;
  }

  return (
    <video className="video" controls preload="metadata" poster={poster}>
      <source src={streamUrl} type="video/mp4" />
      Your browser does not support HTML5 video.
    </video>
  );
}
