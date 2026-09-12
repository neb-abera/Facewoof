import { pool } from "./database.ts";
import type { PackPlaydate } from "./shapes.ts";

export interface NewPlaydate {
  packId: number;
  userId: number;
  playdateBody: string | null;
  startTime: string | Date;
  endTime: string | Date;
}

export const createPlaydate = ({
  packId,
  userId,
  playdateBody,
  startTime,
  endTime,
}: NewPlaydate) =>
  // Passed as timestamps and left to Postgres to parse. The original called
  // toLocaleString() first, which produced a locale dependent string ("3/4/2023,
  // 9:00:00 AM") that Postgres parses differently depending on its DateStyle.
  pool.query(
    `INSERT INTO playdates (pack_id, user_id, body, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5)`,
    [packId, userId, playdateBody, new Date(startTime), new Date(endTime)],
  );

export const getAllPlaydates = (userId: number) =>
  pool.query<{ pack_playdates: PackPlaydate[] | null }>(
    `SELECT json_agg(json_build_object(
       'pack_id', pack_users.pack_id,
       'pack_name', packs.name,
       'playdate_start_date', playdates.start_date,
       'playdate_end_date', playdates.end_date,
       'playdate_body', playdates.body)
     ) AS pack_playdates
     FROM pack_users
     FULL OUTER JOIN packs ON packs.pack_id = pack_users.pack_id
     FULL OUTER JOIN playdates ON playdates.pack_id = packs.pack_id
     WHERE pack_users.user_id = $1;`,
    [userId],
  );
