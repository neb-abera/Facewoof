/*
 * The shape of req.session and the one field middleware adds to req.
 *
 * cookie-session declares its session object with an index signature, so
 * any property is `any`. Merging the two fields this app actually stores
 * gives them real types, and `req.userId` is what requireUser sets once it
 * has established who is calling.
 *
 * Named global.d.ts and not session.d.ts: tsc drops a .d.ts whose basename
 * matches a .ts in the same program, so next to session.ts this file was
 * silently never read.
 */
import type { PendingOidc } from "./session.ts";

declare global {
  namespace CookieSessionInterfaces {
    interface CookieSessionObject {
      userId?: number;
      oidc?: PendingOidc | null;
    }
  }

  namespace Express {
    interface Request {
      /*
       * The acting user, set by requireUser from the session. Absent until
       * that middleware has run, which is why it is optional: a handler
       * mounted before it cannot accidentally read a user that is not there.
       */
      userId?: number;
    }
  }
}
