import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import Modal from "react-modal";
import { BrowserRouter as Router } from "react-router-dom";
import App from "./App";
import "./index.css";
import { UserProvider } from "./context/user";

// BASE_URL is '/' normally, and '/facewoof/' when the app is built to be
// served under a path on another host. The router has to know, or every link
// would drop the prefix.
const basename = import.meta.env.BASE_URL.replace(/\/$/, "");

/*
 * Once, at startup. It was being called inside a view's render body, so it ran
 * on every render of that one page and no other page's dialogs were covered.
 * It tells react-modal what to hide from screen readers while a dialog is up.
 */
Modal.setAppElement("#root");

/*
 * The query cache (src/queries.ts). A list is fresh for half a minute: long
 * enough that moving between views does not refetch what was just shown,
 * short enough that a change made in another tab appears on the next visit.
 * Writes invalidate what they change, so the wait never applies to your own
 * edits.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const root = document.getElementById("root");
if (!root) throw new Error("index.html has no #root element");

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <UserProvider>
        <Router basename={basename}>
          <App />
        </Router>
      </UserProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
