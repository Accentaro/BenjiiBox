import { useState, useEffect } from "react";
import { imgUrl, tmdbFetch } from "../utils/api";
import MediaCard from "./MediaCard";
import { PersonIcon } from "./Icons";

/**
 * Shared "below the fold" detail content: top-billed cast and related titles.
 * Used by both MoviePage and TVPage. Fetches credits + recommendations/similar
 * with the existing tmdbFetch helper.
 *
 * Props:
 *  - mediaType: "movie" | "tv"
 *  - id: TMDB id
 *  - apiKey
 *  - onSelect(item): navigate into a movie/tv detail page
 *  - onSelectPerson(person): navigate into the person page
 */
export default function DetailExtras({
  mediaType,
  id,
  apiKey,
  onSelect,
  onSelectPerson,
}) {
  const [cast, setCast] = useState([]);
  const [related, setRelated] = useState([]);

  useEffect(() => {
    if (!apiKey || !id) return;
    let mounted = true;
    setCast([]);
    setRelated([]);

    tmdbFetch(`/${mediaType}/${id}/credits`, apiKey)
      .then((d) => {
        if (mounted) setCast((d.cast || []).slice(0, 20));
      })
      .catch(() => {});

    tmdbFetch(`/${mediaType}/${id}/recommendations`, apiKey)
      .then((d) => {
        const results = d.results || [];
        if (results.length > 0)
          return results.map((i) => ({ ...i, media_type: mediaType }));
        return tmdbFetch(`/${mediaType}/${id}/similar`, apiKey).then((s) =>
          (s.results || []).map((i) => ({ ...i, media_type: mediaType })),
        );
      })
      .then((items) => {
        if (mounted) setRelated((items || []).slice(0, 20));
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [mediaType, id, apiKey]);

  if (cast.length === 0 && related.length === 0) return null;

  return (
    <>
      {cast.length > 0 && (
        <div className="section">
          <div className="section-title">Cast</div>
          <div className="cast-row">
            {cast.map((person) => (
              <div
                key={person.id}
                className="cast-card"
                onClick={() => onSelectPerson?.(person)}
              >
                <div className="cast-avatar">
                  {person.profile_path ? (
                    <img
                      src={imgUrl(person.profile_path, "w185")}
                      alt={person.name}
                      loading="lazy"
                    />
                  ) : (
                    <PersonIcon size={28} />
                  )}
                </div>
                <div className="cast-name" title={person.name}>
                  {person.name}
                </div>
                {person.character && (
                  <div className="cast-char" title={person.character}>
                    {person.character}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {related.length > 0 && onSelect && (
        <div className="section">
          <div className="section-title">More Like This</div>
          <div className="scroll-row">
            {related.map((m) => (
              <MediaCard key={`${m.media_type}_${m.id}`} item={m} onClick={() => onSelect(m)} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
