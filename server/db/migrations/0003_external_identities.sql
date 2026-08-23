-- Sign-in through an external identity provider.
--
-- The pair (issuer, subject) is what an OIDC provider guarantees is stable and
-- unique for a person; email is neither. People change their email address,
-- providers let an address be reassigned, and matching on it alone would mean
-- whoever holds an address next inherits the account. So the pair is the key,
-- and email is only ever used to fill in a profile.
CREATE TABLE external_identities (
  user_id  integer NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  -- The provider's issuer URL, e.g. https://<tenant>.ciamlogin.com/<id>/v2.0
  issuer   text NOT NULL,
  -- The 'sub' claim: opaque, stable, and unique within that issuer.
  subject  text NOT NULL,
  -- Which upstream provider the person actually used, for display only.
  provider text,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (issuer, subject)
);

CREATE INDEX external_identities_user_id_idx ON external_identities (user_id);

-- A signed-in account is not a guest, and must not be swept up by the guest
-- cleanup. is_guest already defaults false; this is the backstop for anyone
-- who signs in on top of a guest session and gets their account upgraded.
