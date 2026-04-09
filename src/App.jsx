import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { api, mapErrorToToast } from "./api";
import VideoPlayer from "./VideoPlayer";

const EMPTY_LINE = { start: 0, end: 0, text: "", romanized: "", translation: "" };

function App() {
  const [health, setHealth] = useState(null);
  const [healthError, setHealthError] = useState("");

  const [filters, setFilters] = useState({ q: "", type: "", sort: "newest" });
  const [songs, setSongs] = useState([]);
  const [songsError, setSongsError] = useState("");
  const [loadingSongs, setLoadingSongs] = useState(false);

  const [selectedSongId, setSelectedSongId] = useState("");
  const [songDetail, setSongDetail] = useState(null);
  const [detailError, setDetailError] = useState("");

  const [activeLanguage, setActiveLanguage] = useState("");
  const [activeSubtitle, setActiveSubtitle] = useState(null);
  const [subtitleError, setSubtitleError] = useState("");

  const [lineAction, setLineAction] = useState("push");
  const [lineIndex, setLineIndex] = useState(0);
  const [lineDraft, setLineDraft] = useState(EMPTY_LINE);
  const [lineActionMessage, setLineActionMessage] = useState("");

  useEffect(() => {
    api
      .health()
      .then(setHealth)
      .catch((error) => setHealthError(mapErrorToToast(error)));
  }, []);

  useEffect(() => {
    setLoadingSongs(true);
    setSongsError("");

    api
      .listSongs(filters)
      .then((data) => {
        setSongs(data);
        if (!selectedSongId && data.length > 0) {
          setSelectedSongId(data[0]._id);
        }
      })
      .catch((error) => setSongsError(mapErrorToToast(error)))
      .finally(() => setLoadingSongs(false));
  }, [filters, selectedSongId]);

  useEffect(() => {
    if (!selectedSongId) return;

    setDetailError("");
    setSongDetail(null);
    setActiveLanguage("");
    setActiveSubtitle(null);

    api
      .getSongDetail(selectedSongId)
      .then((data) => {
        setSongDetail(data);
        if (data.subtitles?.length) {
          setActiveLanguage(data.subtitles[0].language);
        }
      })
      .catch((error) => setDetailError(mapErrorToToast(error)));
  }, [selectedSongId]);

  useEffect(() => {
    if (!songDetail?._id || !activeLanguage) return;

    setSubtitleError("");
    api
      .getSubtitleByLanguage(songDetail._id, activeLanguage)
      .then((data) => {
        setActiveSubtitle(data);
      })
      .catch((error) => setSubtitleError(mapErrorToToast(error)));
  }, [songDetail, activeLanguage]);

  const streamUrl = useMemo(() => {
    if (!songDetail?.video?._id) return "";
    return `${api.baseUrl}/api/videos/${songDetail.video._id}/stream`;
  }, [songDetail]);

  async function applyLineAction() {
    if (!activeSubtitle?._id) return;

    const body = { action: lineAction };
    if (lineAction === "update" || lineAction === "remove") {
      body.index = Number(lineIndex);
    }
    if (lineAction === "push" || lineAction === "update") {
      body.line = {
        start: Number(lineDraft.start),
        end: Number(lineDraft.end),
        text: lineDraft.text || undefined,
        romanized: lineDraft.romanized || undefined,
        translation: lineDraft.translation || undefined,
      };
    }

    try {
      const updated = await api.updateSubtitleLine(activeSubtitle._id, body);
      setActiveSubtitle(updated);
      setLineActionMessage("Subtitle lines updated.");
    } catch (error) {
      setLineActionMessage(mapErrorToToast(error));
    }
  }

  return (
    <main className="layout">
      <header>
        <h1>AniDB Frontend Integration Demo</h1>
        <p className="muted">API base URL: {api.baseUrl}</p>
      </header>

      <section className="panel">
        <h2>Health</h2>
        {health && <p>Status: {health.status} · Mongo: {health.mongo}</p>}
        {healthError && <p className="error">{healthError}</p>}
      </section>

      <section className="panel">
        <h2>Songs Explorer</h2>
        <div className="filters">
          <input
            placeholder="Search title"
            value={filters.q}
            onChange={(event) => setFilters((prev) => ({ ...prev, q: event.target.value }))}
          />
          <select
            value={filters.type}
            onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
          >
            <option value="">All types</option>
            <option value="OP">OP</option>
            <option value="ED">ED</option>
            <option value="IN">IN</option>
          </select>
          <select
            value={filters.sort}
            onChange={(event) => setFilters((prev) => ({ ...prev, sort: event.target.value }))}
          >
            <option value="newest">Newest</option>
            <option value="title">Title</option>
          </select>
        </div>
        {loadingSongs && <p>Loading songs…</p>}
        {songsError && <p className="error">{songsError}</p>}
        <div className="song-list">
          {songs.map((song) => (
            <button
              key={song._id}
              className={song._id === selectedSongId ? "song-item active" : "song-item"}
              onClick={() => setSelectedSongId(song._id)}
            >
              {song.title} · {song.type}
            </button>
          ))}
        </div>
      </section>

      <section className="panel">
        <h2>Song Detail</h2>
        {detailError && <p className="error">{detailError}</p>}
        {!songDetail && !detailError && <p>Select a song to load details.</p>}
        {songDetail && (
          <>
            <p>
              <strong>{songDetail.title}</strong> · {songDetail.type} · {songDetail.anime?.title}
            </p>
            <VideoPlayer streamUrl={streamUrl} poster={songDetail.video?.cover_url} />

            <h3>Subtitle Tracks</h3>
            <div className="filters">
              <select value={activeLanguage} onChange={(event) => setActiveLanguage(event.target.value)}>
                {songDetail.subtitles?.map((sub) => (
                  <option key={sub._id} value={sub.language}>
                    {sub.language}{sub.is_default ? " (default)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {subtitleError && <p className="error">{subtitleError}</p>}
            {activeSubtitle && (
              <>
                <p>Lines: {activeSubtitle.lines?.length ?? 0}</p>
                <ul className="line-list">
                  {activeSubtitle.lines?.slice(0, 8).map((line, index) => (
                    <li key={`${line.start}-${index}`}>
                      [{line.start} - {line.end}] {line.translation || line.text || "(empty)"}
                    </li>
                  ))}
                </ul>

                <h4>Line Editor (/api/subtitles/:id/lines)</h4>
                <div className="editor-grid">
                  <select value={lineAction} onChange={(event) => setLineAction(event.target.value)}>
                    <option value="push">push</option>
                    <option value="update">update</option>
                    <option value="remove">remove</option>
                  </select>
                  <input
                    type="number"
                    value={lineIndex}
                    onChange={(event) => setLineIndex(event.target.value)}
                    placeholder="Index"
                  />
                  <input
                    type="number"
                    value={lineDraft.start}
                    onChange={(event) => setLineDraft((prev) => ({ ...prev, start: event.target.value }))}
                    placeholder="Start"
                  />
                  <input
                    type="number"
                    value={lineDraft.end}
                    onChange={(event) => setLineDraft((prev) => ({ ...prev, end: event.target.value }))}
                    placeholder="End"
                  />
                  <input
                    value={lineDraft.text}
                    onChange={(event) => setLineDraft((prev) => ({ ...prev, text: event.target.value }))}
                    placeholder="Text"
                  />
                  <input
                    value={lineDraft.translation}
                    onChange={(event) =>
                      setLineDraft((prev) => ({ ...prev, translation: event.target.value }))
                    }
                    placeholder="Translation"
                  />
                </div>
                <button onClick={applyLineAction}>Apply line action</button>
                {lineActionMessage && <p className="muted">{lineActionMessage}</p>}
              </>
            )}
          </>
        )}
      </section>
    </main>
  );
}

export default App;
