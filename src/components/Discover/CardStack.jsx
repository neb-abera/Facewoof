/* eslint-disable react/prop-types */
/* eslint-disable no-shadow */
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FaDog } from 'react-icons/fa';
import axios from 'axios';

import ProfileCard from './ProfileCard';
import Match from './Match';
import Blank from './Blank';
import './cardStack.css';

// Ask for the next page while this many cards are still in hand, so the
// request lands before the stack empties and nobody waits on the network.
const TOP_UP_AT = 4;

const CardStack = ({ users, distances, userData, photos, onRunningLow, hasMore, searchKey }) => {
  const [front, setFront] = useState(null);
  const [back, setBack] = useState(null);

  const [data, setData] = useState([]);
  const [stack, setStack] = useState([]);
  const [user, setUser] = useState(null);

  const [out, setOut] = useState(null);
  const [pass, setPass] = useState(null);

  const [choice, setChoice] = useState(null);
  const [match, setMatch] = useState(false);
  const [matchOut, setMatchOut] = useState(false);

  const [x, setX] = useState(0);
  const [y, setY] = useState(0);

  // The signed-in user, straight from context. This was a useState seeded with
  // a hard coded profile ("Putnam", user_id 7) inside a mount-only effect, so
  // every swipe was recorded against that person rather than the real one.
  const currentUser = userData;

  // Which dogs have been swiped away. The feed arrives in pages and `users`
  // grows as they land, so rebuilding straight from it would resurrect cards
  // that were already dealt with.
  const swiped = useRef(new Set());

  // The drag in progress: where it started and whether it already voted.
  // null between drags.
  const drag = useRef(null);

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

  useEffect(() => {
    if (data.length > 1 && (out !== null || pass !== null)) {
      setFront(data[1].user_id);
    }
    if (data.length > 2 && (out !== null || pass !== null)) {
      setBack(data[2].user_id);
    }
    setTimeout(() => {
      if (out !== null || pass !== null) {
        setData(data.slice(1));
        setX(0);
        setY(0);
      }
    }, 300);
  }, [out, pass]);

  useEffect(() => {
    setStack(data.slice(0, 3).reverse());
    setUser(data[0]);
  }, [data]);

  function setRelationship(user1, user2, choice) {
    axios
      .post('/api/response', {
        currentUserId: user1.user_id,
        otherUserId: user2.user_id,
        currentUserChoice: choice,
        otherUserChoice: user2.user1_choice
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function handleVote(e) {
    if (!user || !currentUser) return;
    swiped.current.add(user.user_id);
    setChoice(user);
    if (e.target.id === 'digg') {
      setOut(user.user_id);
      setRelationship(currentUser, user, true);
      if (user.user1_choice === true) {
        setMatch(true);
      }
    } else {
      setRelationship(currentUser, user, false);
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
  function dragStart(e) {
    if (e.button !== undefined && e.button !== 0) return;
    drag.current = { fromX: e.clientX, voted: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }

  function dragMove(e) {
    if (!drag.current || drag.current.voted) return;
    const dx = e.clientX - drag.current.fromX;
    setX(dx);
    if (dx > 150) {
      drag.current.voted = true;
      handleVote({ target: { id: 'digg' } });
    } else if (dx < -150) {
      drag.current.voted = true;
      handleVote({ target: { id: 'pass' } });
    }
  }

  function dragEnd() {
    if (drag.current && !drag.current.voted) {
      setX(0);
      setY(0);
    }
    drag.current = null;
  }

  return (
    <div className="card-stack-parent">
      {match ? (
        <div className={matchOut ? 'match-out' : ''}>
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
            {stack.map((user, index) => {
              if (index === stack.length - 1) {
                return (
                  <div
                    key={`user${user.user_id}`}
                    onPointerDown={dragStart}
                    onPointerMove={dragMove}
                    onPointerUp={dragEnd}
                    onPointerCancel={dragEnd}
                    style={{ transform: `translate(${x}px, ${y}px)`, touchAction: 'pan-y' }}
                    className={`profile-card
                      ${out === user.user_id ? 'unmount' : ''}
                      ${pass === user.user_id ? 'pass-unmount' : ''}
                      ${front === user.user_id ? 'mount' : ''}
                      ${back === user.user_id ? 'back-mount' : ''}
                      ${index === 0 ? 'back' : ''}
                    `}
                  >
                    <div className="card-wrapper">
                      <ProfileCard user={user} distance={distances[user.location]} />
                    </div>
                  </div>
                );
              }
              return (
                <div
                  key={`user${user.user_id}`}
                  className={`profile-card
                    ${out === user.user_id ? 'unmount' : ''}
                    ${pass === user.user_id ? 'pass-unmount' : ''}
                    ${front === user.user_id ? 'mount' : ''}
                    ${back === user.user_id ? 'back-mount' : ''}
                    ${index === 0 ? 'back' : ''}
                  `}
                >
                  <div className="card-wrapper">
                    <ProfileCard user={user} distance={distances[user.location]} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <Blank />
        )}
        <div className="buttons">
          <button
            id="pass"
            type="button"
            className="btn btn-active btn-secondary vote-button pass"
            onClick={handleVote}
          >
            Pass
          </button>
          <button
            id="digg"
            type="button"
            className="btn btn-active btn-primary vote-button digg"
            onClick={handleVote}
          >
            Woof
          </button>
        </div>
      </div>
    </div>
  );
};

export default CardStack;
