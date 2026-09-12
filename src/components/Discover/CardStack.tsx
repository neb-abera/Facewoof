import { type PointerEvent, useEffect, useRef, useState } from "react";
import { api } from "../../api";
import type { DiscoverPage, FeedCard, User } from "../../types";
import Blank from "./Blank";
import Match from "./Match";
import ProfileCard from "./ProfileCard";
import "./cardStack.css";

// Ask for the next page while this many cards are still in hand, so the
// request lands before the stack empties and nobody waits on the network.
const TOP_UP_AT = 4;

interface CardStackProps {
  users: FeedCard[];
  distances: DiscoverPage["distances"];
  userData: User | null;
  /* The signed-in user's own photos, for the match screen. */
  photos: string[];
  onRunningLow: () => void;
  hasMore: boolean;
  /* Bumped by a new search, so the stack forgets what was swiped. */
  searchKey: number;
}

const CardStack = ({
  users,
  distances,
  userData,
  photos,
  onRunningLow,
  hasMore,
  searchKey,
}: CardStackProps) => {
  const [front, setFront] = useState<number | null>(null);
  const [back, setBack] = useState<number | null>(null);

  const [data, setData] = useState<FeedCard[]>([]);
  const [stack, setStack] = useState<FeedCard[]>([]);
  const [user, setUser] = useState<FeedCard | null>(null);

  const [out, setOut] = useState<number | null>(null);
  const [pass, setPass] = useState<number | null>(null);

  const [choice, setChoice] = useState<FeedCard | null>(null);
  const [match, setMatch] = useState(false);

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  // The signed-in user, straight from context. This was a useState seeded with
  // a hard coded profile ("Putnam", user_id 7) inside a mount-only effect, so
  // every swipe was recorded against that person rather than the real one.
  const currentUser = userData;

  // Which dogs have been swiped away. The feed arrives in pages and `users`
  // grows as they land, so rebuilding straight from it would resurrect cards
  // that were already dealt with.
  const swiped = useRef(new Set<number>());

  // The drag in progress: where it started and whether it already voted.
  // null between drags.
  const drag = useRef<{ fromX: number; voted: boolean } | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: searchKey is the trigger, not an input — a new search forgets what was swiped in the old one
  useEffect(() => {
    swiped.current = new Set();
  }, [searchKey]);

  useEffect(() => {
    setData(users.filter((u) => !swiped.current.has(u.user_id)));
  }, [users]);

  // Top up before the stack runs out rather than when it has.
  useEffect(() => {
    if (hasMore && data.length <= TOP_UP_AT) onRunningLow();
  }, [data.length, hasMore, onRunningLow]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once per vote, on out/pass only — re-running on every data change would restart the 300ms exit animation mid-flight
  useEffect(() => {
    const voted = out !== null || pass !== null;
    const second = data[1];
    const third = data[2];
    if (second && voted) setFront(second.user_id);
    if (third && voted) setBack(third.user_id);
    setTimeout(() => {
      if (voted) {
        setData(data.slice(1));
        setX(0);
        setY(0);
      }
    }, 300);
  }, [out, pass]);

  useEffect(() => {
    setStack(data.slice(0, 3).reverse());
    setUser(data[0] ?? null);
  }, [data]);

  function setRelationship(user2: FeedCard, currentUserChoice: boolean) {
    api
      .POST("/api/response", {
        body: {
          otherUserId: user2.user_id,
          currentUserChoice,
          otherUserChoice: user2.user1_choice,
        },
      })
      .catch((err: unknown) => {
        console.error("could not record the swipe", err);
      });
  }

  function handleVote(liked: boolean) {
    if (!user || !currentUser) return;
    swiped.current.add(user.user_id);
    setChoice(user);
    if (liked) {
      setOut(user.user_id);
      setRelationship(user, true);
      if (user.user1_choice === true) {
        setMatch(true);
      }
    } else {
      setRelationship(user, false);
      setPass(user.user_id);
    }
  }

  function handleContinue() {
    setMatch(false);
  }

  /*
   * Dragging a card sideways to choose, on plain pointer events.
   *
   * This used react-draggable, which reaches for findDOMNode — removed in
   * React 19 — so every drag died on mousedown and the gesture the feed is
   * built around silently stopped working; only the buttons survived.
   * Pointer events need no library, and unlike the mouse events the library
   * listened for, they are also how a finger drags — swiping never worked on
   * a touch screen before.
   *
   * Past 150px the drag becomes the vote, once: the old handler voted again
   * on every pixel past the threshold, sending a duplicate POST per
   * mousemove until the card left.
   */
  function dragStart(e: PointerEvent<HTMLDivElement>) {
    if (e.button !== 0) return;
    drag.current = { fromX: e.clientX, voted: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function dragMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current || drag.current.voted) return;
    const dx = e.clientX - drag.current.fromX;
    setX(dx);
    if (dx > 150) {
      drag.current.voted = true;
      handleVote(true);
    } else if (dx < -150) {
      drag.current.voted = true;
      handleVote(false);
    }
  }

  function dragEnd() {
    if (drag.current && !drag.current.voted) {
      setX(0);
      setY(0);
    }
    drag.current = null;
  }

  const cardClass = (card: FeedCard, index: number) =>
    `profile-card
      ${out === card.user_id ? "unmount" : ""}
      ${pass === card.user_id ? "pass-unmount" : ""}
      ${front === card.user_id ? "mount" : ""}
      ${back === card.user_id ? "back-mount" : ""}
      ${index === 0 ? "back" : ""}
    `;

  return (
    <div className="card-stack-parent">
      {match && choice ? (
        <div>
          <Match
            handleContinue={handleContinue}
            user1={currentUser}
            user2={choice}
            photos={photos}
          />
        </div>
      ) : null}
      <div className="discover-cardview-parent">
        {stack.length > 0 ? (
          <div className="card-stack">
            {stack.map((card, index) =>
              index === stack.length - 1 ? (
                <div
                  key={`user${card.user_id}`}
                  onPointerDown={dragStart}
                  onPointerMove={dragMove}
                  onPointerUp={dragEnd}
                  onPointerCancel={dragEnd}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                    touchAction: "pan-y",
                  }}
                  className={cardClass(card, index)}
                >
                  <div className="card-wrapper">
                    <ProfileCard
                      user={card}
                      distance={
                        card.location ? distances[card.location] : undefined
                      }
                    />
                  </div>
                </div>
              ) : (
                <div
                  key={`user${card.user_id}`}
                  className={cardClass(card, index)}
                >
                  <div className="card-wrapper">
                    <ProfileCard
                      user={card}
                      distance={
                        card.location ? distances[card.location] : undefined
                      }
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <Blank />
        )}
        <div className="buttons">
          <button
            id="pass"
            type="button"
            className="btn btn-active btn-secondary vote-button pass"
            onClick={() => handleVote(false)}
          >
            Pass
          </button>
          <button
            id="digg"
            type="button"
            className="btn btn-active btn-primary vote-button digg"
            onClick={() => handleVote(true)}
          >
            Woof
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardStack;
