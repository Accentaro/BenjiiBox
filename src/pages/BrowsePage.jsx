import { useState, useEffect, useCallback } from "react";
import MediaCard from "../components/MediaCard";
import { tmdbFetch } from "../utils/api";

const PROVIDERS = [
  { id: "", label: "All providers" },
  { id: "8", label: "Netflix" },
  { id: "9", label: "Prime Video" },
  { id: "337", label: "Disney+" },
  { id: "350", label: "Apple TV+" },
  { id: "1899", label: "Max" },
  { id: "15", label: "Hulu" },
];

const SORTS = [
  { id: "popularity.desc", label: "Popular" },
  { id: "vote_average.desc", label: "Top Rated" },
  { id: "primary_release_date.desc", label: "Newest" },
  { id: "revenue.desc", label: "Trending" },
];

const QUALITIES = [
  { id: "", label: "All" },
  { id: "sd", label: "SD" },
  { id: "hd", label: "HD" },
  { id: "4k", label: "4K" },
];

const WATCH_REGION = "US";
const PAGES_PER_LOAD = 5;

export default function BrowsePage({ apiKey, onSelect }) {
  const [mediaType, setMediaType] = useState("movie");
  const [genres, setGenres] = useState([]);
  const [genre, setGenre] = useState("");
  const [provider, setProvider] = useState("");
  const [sort, setSort] = useState("popularity.desc");
  const [quality, setQuality] = useState("");
  const [items, setItems] = useState([]);
  const [nextBatch, setNextBatch] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    if (!apiKey) return;
    let mounted = true;
    tmdbFetch(`/genre/${mediaType}/list`, apiKey)
      .then((d) => { if (mounted) setGenres(d.genres || []); })
      .catch(() => {});
    setGenre("");
    setNextBatch(1);
    setItems([]);
    return () => { mounted = false; };
  }, [mediaType, apiKey]);

  useEffect(() => {
    setNextBatch(1);
    setItems([]);
  }, [genre, provider, sort, quality, mediaType]);

  const buildParams = useCallback((pg) => {
    const params = new URLSearchParams({
      sort_by: sort,
      include_adult: "false",
      page: String(pg),
      "vote_count.gte": sort === "vote_average.desc" ? "200" : "0",
    });
    if (genre) params.set("with_genres", genre);
    if (provider) {
      params.set("with_watch_providers", provider);
      params.set("watch_region", WATCH_REGION);
    }
    const dateKey =
      mediaType === "tv" ? "first_air_date" : "primary_release_date";
    if (quality === "sd") {
      params.set(`${dateKey}.lte`, "2006-12-31");
    } else if (quality === "hd") {
      params.set(`${dateKey}.gte`, "2007-01-01");
      params.set(`${dateKey}.lte`, "2015-12-31");
    } else if (quality === "4k") {
      params.set(`${dateKey}.gte`, "2016-01-01");
    }
    return params;
  }, [sort, genre, provider, quality, mediaType]);

  const fetchBatch = useCallback(async (startPage) => {
    const MAX_TMDB_PAGES = 500;
    const pages = Array.from(
      { length: PAGES_PER_LOAD },
      (_, i) => startPage + i,
    ).filter((p) => p <= MAX_TMDB_PAGES);

    const results = await Promise.all(
      pages.map((pg) =>
        tmdbFetch(
          `/discover/${mediaType}?${buildParams(pg).toString()}`,
          apiKey,
        ).catch(() => ({ results: [], total_pages: 1 })),
      ),
    );

    const merged = results.flatMap((d) =>
      (d.results || []).map((i) => ({ ...i, media_type: mediaType })),
    );
    const maxTotal = Math.max(...results.map((d) => d.total_pages || 1));
    return { merged, maxTotal };
  }, [apiKey, mediaType, buildParams]);

  useEffect(() => {
    if (!apiKey || nextBatch !== 1) return;
    setLoading(true);
    fetchBatch(1)
      .then(({ merged, maxTotal }) => {
        setItems(merged);
        setTotalPages(Math.min(maxTotal, 500));
        setNextBatch(1 + PAGES_PER_LOAD);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [apiKey, mediaType, genre, provider, sort, quality, fetchBatch, nextBatch]);

  const loadMore = useCallback(() => {
    if (!apiKey || loadingMore || nextBatch > totalPages) return;
    setLoadingMore(true);
    fetchBatch(nextBatch)
      .then(({ merged, maxTotal }) => {
        setItems((prev) => [...prev, ...merged]);
        setTotalPages(Math.min(maxTotal, 500));
        setNextBatch((p) => p + PAGES_PER_LOAD);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }, [apiKey, fetchBatch, nextBatch, totalPages, loadingMore]);

  const currentPage = Math.ceil((nextBatch - 1) / PAGES_PER_LOAD);
  const totalBatches = Math.ceil(totalPages / PAGES_PER_LOAD);

  return (
    <div className="fade-in">
      <div className="library-header">
        <div className="library-title">Browse</div>
        <div className="library-sub">
          Discover movies and shows by genre and provider.
        </div>
      </div>

      <div className="browse-controls">
        <div className="browse-control-group">
          <button
            className={`browse-chip${mediaType === "movie" ? " browse-chip--active" : ""}`}
            onClick={() => setMediaType("movie")}
          >
            Movies
          </button>
          <button
            className={`browse-chip${mediaType === "tv" ? " browse-chip--active" : ""}`}
            onClick={() => setMediaType("tv")}
          >
            Series
          </button>
        </div>

        <select
          className="browse-select"
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
        >
          <option value="">All genres</option>
          {genres.map((g) => (
            <option key={g.id} value={g.id}>{g.name}</option>
          ))}
        </select>

        <select
          className="browse-select"
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
        >
          {PROVIDERS.map((p) => (
            <option key={p.label} value={p.id}>{p.label}</option>
          ))}
        </select>

        <select
          className="browse-select"
          value={sort}
          onChange={(e) => setSort(e.target.value)}
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>{s.label}</option>
          ))}
        </select>

        <div className="browse-control-group">
          {QUALITIES.map((q) => (
            <button
              key={q.id}
              className={`browse-chip${quality === q.id ? " browse-chip--active" : ""}`}
              onClick={() => setQuality(q.id)}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loader"><div className="spinner" /></div>
      ) : items.length === 0 ? (
        <div className="empty-state">
          <h3>Nothing found</h3>
          <p>Try a different genre, provider or sort order.</p>
        </div>
      ) : (
        <>
          <div className="section">
            <div className="cards-grid">
              {items.map((m) => (
                <MediaCard
                  key={`${m.media_type}_${m.id}`}
                  item={m}
                  onClick={() => onSelect?.(m)}
                />
              ))}
            </div>
          </div>

          {nextBatch <= totalPages && (
            <div className="browse-load-more">
              <button
                className="browse-load-more-btn"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? (
                  <>
                    <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                    Loading…
                  </>
                ) : (
                  `Load more  (batch ${currentPage} of ${totalBatches})`
                )}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
