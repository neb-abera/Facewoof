import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, test, vi } from "vitest";
import AddPlaydate from "../../src/components/Calendar/AddPlaydate";
import { created, fakeApi, ok } from "./fakeApi";
import { withUser } from "./withUser";

// The date picker renders AM/PM selects of its own; the pack select is the
// one labelled as such.
const packSelect = () => screen.getByRole("combobox", { name: /pack/i });

const start = new Date("2026-09-12T10:00:00Z");
const end = new Date("2026-09-12T11:00:00Z");

// The packs come from the query cache, fed by the fake API.
const withPacks = (api: ReturnType<typeof fakeApi>) =>
  api.on("GET", "/api/getpacks", () =>
    ok([{ pack_id: 3, name: "Chelsea Morning Crew" }]),
  );

const renderForm = (
  api = withPacks(fakeApi()),
  overrides: Partial<Parameters<typeof AddPlaydate>[0]> = {},
) => {
  const onAdded = vi.fn(async () => {});
  const closeAddModal = vi.fn();
  render(
    withUser(
      <AddPlaydate
        closeAddModal={closeAddModal}
        playStartTime={start}
        setStartTime={() => {}}
        playEndTime={end}
        setEndTime={() => {}}
        onAdded={onAdded}
        {...overrides}
      />,
    ),
  );
  return { api, onAdded, closeAddModal };
};

/* The pack option, once the packs query has answered. */
const packOption = () => screen.findByRole("option", { name: /chelsea/i });

test("refuses to submit without a pack, and says so", async () => {
  const { api } = renderForm();
  await packOption();
  await userEvent.click(screen.getByRole("button", { name: /add playdate/i }));
  expect(screen.getByText(/choose a pack first/i)).toBeInTheDocument();
  expect(api.calls.filter((c) => c.method === "POST")).toHaveLength(0);
});

test("refuses an end time before the start time", async () => {
  const { api } = renderForm(withPacks(fakeApi()), {
    playEndTime: new Date("2026-09-12T09:00:00Z"),
  });
  await packOption();
  await userEvent.selectOptions(packSelect(), "3");
  await userEvent.click(screen.getByRole("button", { name: /add playdate/i }));
  expect(screen.getByText(/end time has to be after/i)).toBeInTheDocument();
  expect(api.calls.filter((c) => c.method === "POST")).toHaveLength(0);
});

test("posts the playdate, reloads the calendar and closes", async () => {
  const api = withPacks(fakeApi()).on("POST", "/api/addplaydate", () =>
    created({ message: "playdate added" }),
  );
  const { onAdded, closeAddModal } = renderForm(api);

  await packOption();
  await userEvent.selectOptions(packSelect(), "3");
  await userEvent.type(screen.getByRole("textbox"), "Puddle patrol");
  await userEvent.click(screen.getByRole("button", { name: /add playdate/i }));

  await waitFor(() => expect(closeAddModal).toHaveBeenCalled());
  expect(onAdded).toHaveBeenCalledTimes(1);
  expect(api.calls.filter((c) => c.method === "POST")).toEqual([
    {
      method: "POST",
      path: "/api/addplaydate",
      body: {
        packId: 3,
        playdateBody: "Puddle patrol",
        startTime: start.toISOString(),
        endTime: end.toISOString(),
      },
    },
  ]);
});

test("keeps the form open with a message when the server refuses", async () => {
  const api = withPacks(fakeApi()).on(
    "POST",
    "/api/addplaydate",
    () => new Response(JSON.stringify({ error: "nope" }), { status: 500 }),
  );
  const { closeAddModal } = renderForm(api);
  vi.spyOn(console, "error").mockImplementation(() => {});

  await packOption();
  await userEvent.selectOptions(packSelect(), "3");
  await userEvent.click(screen.getByRole("button", { name: /add playdate/i }));

  expect(await screen.findByText(/could not be saved/i)).toBeInTheDocument();
  expect(closeAddModal).not.toHaveBeenCalled();
});
