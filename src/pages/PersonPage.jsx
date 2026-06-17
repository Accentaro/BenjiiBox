import { useState, useEffect } from "react";
import { imgUrl, tmdbFetch } from "../utils/api";
import MediaCard from "../components/MediaCard";
import { BackIcon, PersonIcon } from "../components/Icons";

/**
 * Minimal person/cast detail page. Shows the person's profile + bio and the
 * movies/shows they appear in. Selecting a credit reuses the existing
 * navigation into MoviePage / TVPage.
 *
 * Props:
 *  - person: the cast object that was clicked (must contain at least { id, name })
 *  - apiKey
 *  - onSelect(item): navigate into a movie/tv detail page
 *  - onBack
 */
export default function PersonPage({ person, apiKey, onSelect, onBack }) {
  const [details, setDetails] = useState(null);
  const [credits, setCredits] = useState([]);

  useEffect(() => {
    if (!apiKey || !person?.id) return;
    let mounted = true;
    setDetails(null);
    setCredits([]);

    tmdbFetch(`/person/${person.id}`, apiKey)
      .then((d) => {
        if (mounted) setDetails(d);
      })
      .catch(() => {});

    tmdbFetch(`/person/${person.id}/combined_credits`, apiKey)
      .then((d) => {
        // Only keep movie/tv credits that have a poster, dedupe and sort by popularity
        const seen = new Set();
        const list = (d.cast || [])
          .filter((c) => c.media_type === "movie" || c.media_type === "tv")
          .filter((c) => {
            const key = `${c.media_type}_${c.id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
        if (mounted) setCredits(list);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [person?.id, apiKey]);

  const name = details?.name || person?.name || "Unknown";
  const profile = details?.profile_path || person?.profile_path;
  const bio = details?.biography;

  return (
    <div className="fade-in person-page">
      <div className="person-header">
        <div className="person-avatar">
          {profile ? (
            <img src={imgUrl(profile, "w342")} alt={name} />
          ) : (
            <PersonIcon size={56} />
          )}
        </div>
        <div className="person-info">
          <div className="detail-type">Person</div>
          <div className="detail-title">{name}</div>
          {details?.known_for_department && (
            <div className="detail-meta">
              <span>{details.known_for_department}</span>
              {details.place_of_birth && <span>{details.place_of_birth}</span>}
            </div>
          )}
          {bio && <p className="person-bio">{bio}</p>}
          <div className="detail-actions">
            <button className="btn btn-ghost" onClick={onBack}>
              <BackIcon /> Back
            </button>
          </div>
        </div>
      </div>

      {credits.length > 0 && (
        <div className="section">
          <div className="section-title">Appears In</div>
          <div className="cards-grid">
            {credits.map((c) => (
              <MediaCard
                key={`${c.media_type}_${c.id}`}
                item={c}
                onClick={() => onSelect?.(c)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
