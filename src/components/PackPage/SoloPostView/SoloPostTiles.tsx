import { type CSSProperties, useCallback, useEffect, useState } from "react";
import { api } from "../../../api";
import type { Post } from "../../../types";
import PostMaker from "./PostMaker";
import SoloPostTile from "./SoloPostTile";

interface SoloPostTilesProps {
  viewing: number;
  viewingName: string;
}

const styles: Record<"posts" | "packHighest", CSSProperties> = {
  posts: {
    display: "flex",
    flexDirection: "column",
    maxWidth: "100vw",
    minWidth: "80vw",
  },
  packHighest: {
    display: "flex",
    flexDirection: "column",
  },
};

const SoloPostTiles = ({ viewing, viewingName }: SoloPostTilesProps) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [pfp, setPfp] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await api.GET("/api/getSoloPosts", {
      params: { query: { packId: viewing } },
    });
    setPosts(data ?? []);
    const photos = await api.GET("/api/getPfp");
    setPfp(photos.data?.[0]?.url ?? null);
  }, [viewing]);

  useEffect(() => {
    load().catch((err: unknown) =>
      console.error("could not load the pack's posts", err),
    );
  }, [load]);

  // Newest first.
  const sorted = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="card" style={styles.packHighest}>
      <div>
        <PostMaker
          pfp={pfp}
          viewing={viewing}
          viewingName={viewingName}
          onPosted={() => {
            load().catch(() => {});
          }}
        />
      </div>
      <div style={styles.posts}>
        {sorted.map((each) => (
          <SoloPostTile
            key={each.post_id}
            img={each.photo_url}
            content={each.body}
            postedOn={each.date}
            parentGroup={viewingName}
          />
        ))}
      </div>
    </div>
  );
};

export default SoloPostTiles;
