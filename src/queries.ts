/*
 * The client's server state, as queries.
 *
 * Every list the app reads — the account's photos, friends, packs,
 * playdates, sign-in providers, a pack's posts, the feed of every pack — is
 * a query here, keyed so that the writes which change it can invalidate it.
 * A playdate saved on the calendar then shows up in the pack feed's sidebar
 * without that sidebar fetching by hand, and two components asking for the
 * packs share one request. Before this, each view carried its own
 * useEffect-into-useState fetch and its own idea of when to refresh.
 *
 * The discover feed is not here on purpose: it pages by exclusion with a
 * client-side list of what has been dealt, which is a purpose-built loader
 * (src/hooks/useUserLocation.ts) rather than a list the cache expresses
 * better.
 *
 * Every hook goes through the typed api client, so the shapes are the
 * contract's.
 */
import {
  type UseQueryOptions,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api, unwrap } from "./api";
import { unsignedUploadsConfigured } from "./components/FileUploader/cloudinary";
import type { CalendarEvent, Pack, Playdate, Providers } from "./types";

/* Keys, in one place, so an invalidation and the query it targets agree. */
export const keys = {
  providers: ["providers"] as const,
  uploads: ["uploads"] as const,
  photos: ["me", "photos"] as const,
  friends: ["me", "friends"] as const,
  packs: ["me", "packs"] as const,
  playdates: ["me", "playdates"] as const,
  myPlaydates: ["me", "playdates", "mine"] as const,
  allPosts: ["me", "posts"] as const,
  packPosts: (packId: number) => ["packs", packId, "posts"] as const,
};

/* Which sign-in options this deployment offers; none when not configured. */
export const useProviders = () =>
  useQuery({
    queryKey: keys.providers,
    queryFn: async (): Promise<Providers["providers"]> => {
      const data = unwrap(await api.GET("/api/auth/providers"));
      return data.configured ? data.providers : [];
    },
    // Fixed per deployment; asking once per session is plenty.
    staleTime: Number.POSITIVE_INFINITY,
  });

/*
 * Whether to offer photo upload at all: the server signs uploads, or this
 * bundle was built with an unsigned preset. Only asked when the bundle alone
 * cannot say yes.
 */
export const useUploadsOffered = (): boolean => {
  const { data } = useQuery({
    queryKey: keys.uploads,
    queryFn: async () => unwrap(await api.GET("/api/uploads/config")),
    enabled: !unsignedUploadsConfigured,
    staleTime: Number.POSITIVE_INFINITY,
  });
  return unsignedUploadsConfigured || data?.signed === true;
};

/* The signed-in user's own photo URLs, profile photo first. */
export const usePhotos = (enabled = true) =>
  useQuery({
    queryKey: keys.photos,
    queryFn: async () =>
      unwrap(await api.GET("/api/profilephoto")).map((row) => row.url),
    enabled,
  });

export const useFriends = (enabled = true) =>
  useQuery({
    queryKey: keys.friends,
    queryFn: async () => unwrap(await api.GET("/api/friends")),
    enabled,
  });

export const usePacks = (
  options: Pick<UseQueryOptions<Pack[]>, "enabled"> = {},
) =>
  useQuery({
    queryKey: keys.packs,
    queryFn: async () => unwrap(await api.GET("/api/getpacks")),
    ...options,
  });

/* Every playdate in the caller's packs, as calendar events. */
export const usePlaydates = () =>
  useQuery({
    queryKey: keys.playdates,
    queryFn: async (): Promise<CalendarEvent[]> =>
      unwrap(await api.GET("/api/playdates")).map((row, i) => ({
        id: i,
        title: `${row.pack_name}: ${row.playdate_body ?? ""}`,
        start: new Date(row.playdate_start_date),
        end: new Date(row.playdate_end_date),
      })),
  });

/* The playdates the caller created, soonest first. */
export const useMyPlaydates = () =>
  useQuery({
    queryKey: keys.myPlaydates,
    queryFn: async (): Promise<Playdate[]> =>
      unwrap(await api.GET("/api/getUserPlaydates")),
  });

/*
 * The feeds, a page at a time.
 *
 * Both of these used to ask for everything: every post in every pack the
 * caller belongs to, on every page load, with no LIMIT anywhere in the
 * query. The server now answers a page and says whether there is another,
 * so these are infinite queries and the views end with a Load more.
 *
 * `nextCursor` null is the last page, which is what stops
 * `getNextPageParam` and hides the button.
 */

/* Every post in every pack the caller is in, newest first. */
export const useAllPosts = () =>
  useInfiniteQuery({
    queryKey: keys.allPosts,
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET("/api/getAllPacksPostsForUser", {
          // Spread, not `cursor: pageParam`. exactOptionalPropertyTypes
          // distinguishes an absent key from one set to undefined, and the
          // first page has no cursor at all.
          params: { query: { ...(pageParam ? { cursor: pageParam } : {}) } },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

/* One pack's posts, newest first. */
export const usePackPosts = (packId: number) =>
  useInfiniteQuery({
    queryKey: keys.packPosts(packId),
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam }) =>
      unwrap(
        await api.GET("/api/getSoloPosts", {
          params: {
            query: { packId, ...(pageParam ? { cursor: pageParam } : {}) },
          },
        }),
      ),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });

/* Put a playdate on a pack's calendar; every list that shows it refreshes. */
export const useAddPlaydate = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      packId: number;
      playdateBody: string | null;
      startTime: string;
      endTime: string;
    }) => unwrap(await api.POST("/api/addplaydate", { body })),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.playdates }),
  });
};

/* Post to a pack; the pack's feed and the all-packs feed refresh. */
export const useMakePost = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (packet: {
      pack_id: number;
      body: string | null;
      photo_url: string | null;
    }) => unwrap(await api.POST("/api/makePost", { body: { packet } })),
    onSuccess: (_data, packet) =>
      Promise.all([
        client.invalidateQueries({ queryKey: keys.packPosts(packet.pack_id) }),
        client.invalidateQueries({ queryKey: keys.allPosts }),
      ]),
  });
};

/* Create a pack with the given members; the caller's packs refresh. */
export const useCreatePack = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: { pack_name: string; users: number[] }) =>
      unwrap(await api.PUT("/api/createpack", { body })),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.packs }),
  });
};

/* Join a pack a friend is in. A refusal is the server's 403. */
export const useJoinPack = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (packId: number) =>
      unwrap(await api.PUT("/api/addtopack", { body: { pack_id: packId } })),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.packs }),
  });
};

/* Add a photo to the caller's profile; the photo lists refresh. */
export const useAddPhoto = () => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (photoUrl: string) =>
      unwrap(await api.POST("/api/photos", { body: { photoUrl } })),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.photos }),
  });
};
