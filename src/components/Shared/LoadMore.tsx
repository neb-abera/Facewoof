import type { CSSProperties } from "react";

/*
 * The end of a paged feed.
 *
 * The feeds used to return every post there was, so there was nothing to put
 * here. They answer a page and a cursor now, and this is what asks for the
 * next one. It renders nothing when the server said there is no next page,
 * which is how a short feed looks exactly as it did before.
 */
interface LoadMoreProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onClick: () => void;
  /* What is being loaded, for the screen reader: "posts", "playdates". */
  label: string;
}

const styles: Record<"wrap", CSSProperties> = {
  wrap: {
    display: "flex",
    justifyContent: "center",
    padding: "1rem 0",
  },
};

const LoadMore = ({
  hasNextPage,
  isFetchingNextPage,
  onClick,
  label,
}: LoadMoreProps) => {
  if (!hasNextPage) return null;

  return (
    <div style={styles.wrap}>
      <button
        type="button"
        className="btn"
        onClick={onClick}
        disabled={isFetchingNextPage}
        aria-label={`Load more ${label}`}
      >
        {isFetchingNextPage ? "Loading…" : "Load more"}
      </button>
    </div>
  );
};

export default LoadMore;
