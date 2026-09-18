import { pool } from "./database.ts";

/*
 * The session version an account is on, or null when the account is gone
 * (an expired guest swept up by the cleanup). A primary-key lookup of one
 * integer: this runs on every authenticated request.
 */
export const sessionVersionOf = (userId: number): Promise<number | null> =>
  pool
    .query<{ session_version: number }>(
      "SELECT session_version FROM users WHERE user_id = $1",
      [userId],
    )
    .then(({ rows }) => rows[0]?.session_version ?? null);

/* End every session the account has, on every device. */
export const bumpSessionVersion = (userId: number) =>
  pool.query(
    "UPDATE users SET session_version = session_version + 1 WHERE user_id = $1",
    [userId],
  );
