import React from "react";
import ReactModal from "react-modal";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import Portal from "portal";

import { Spinner as Loader, Alert, ToastContainer, toast } from "react-cui-2.0";

import history from "../history";
import { getServerBulks } from "../actions";

import { srvRegex } from "./utils";
import ServerData from "./ServerData";

const redirect = () => {
  setTimeout(() => {
    window.location.href = globals.rest.sessions;
  }, 2000);
  toast.info("Redirecting", "No sessions found for the server, redirecting...");
  return <Loader text="Redirecting..." />;
};

export default () => {
  const [server, setServer] = React.useState("");

  React.useEffect(() => {
    ReactModal.setAppElement("body");

    const [, srv] = history.location.pathname.match(srvRegex);
    setServer(srv);
  }, []);

  const loadingState = useAsync({
    promiseFn: getServerBulks,
    server,
    watch: server,
  });

  return (
    <>
      <IfPending state={loadingState}>
        <Loader />
      </IfPending>
      <IfRejected state={loadingState}>
        {(error) => (
          <Alert type="error" title="Operation failed">
            {"Couldn't get server data: "}
            {error.message}
          </Alert>
        )}
      </IfRejected>
      <IfFulfilled state={loadingState}>
        {({ server: received, state }) => {
          if (!received || !Array.isArray(received)) {
            if (state === "success") return redirect();
            return <Loader />;
          }
          const got = received[0];

          if (got.server === "NOT_LOADED" || got.bulks === "NOT_LOADED")
            return <Loader />;

          if (!Array.isArray(got.bulks) || !got.bulks.length) {
            return redirect();
          }

          return (
            <ServerData
              server={got}
              reloadBulks={() => loadingState.reload()}
            />
          );
        }}
      </IfFulfilled>
      <Portal id="toast-portal">
        <ToastContainer />
      </Portal>
    </>
  );
};
