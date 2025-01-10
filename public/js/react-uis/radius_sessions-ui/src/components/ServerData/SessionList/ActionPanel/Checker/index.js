import React from "react";
import { useParams } from "react-router-dom";
import { getIn } from "formik";

import { toast } from "react-cui-2.0";

import { SessionsContext } from "../../../../../contexts";
import { checkSessions } from "../../../../../actions";

const Checker = () => {
  const {
    removeSessions,
    updateSessions,
    block: { blocked },
  } = React.useContext(SessionsContext);
  const { server, bulk } = useParams();

  const [checkTimer, setCheckTimer] = React.useState(null);

  const checkerCb = React.useCallback(() => {
    if (!Array.isArray(blocked) || !blocked.length) {
      setCheckTimer(null);
      return;
    }

    const asyncCheck = async () => {
      try {
        const r = await checkSessions(server, bulk, {
          "check-session": `array:${blocked.join(",")}`,
        });

        const gotIds = Object.keys(r)
          .map((k) => parseInt(k, 10) || null)
          .filter((id) => id);
        const removed = blocked.filter((id) => !gotIds.includes(id));
        if (removed.length) {
          removeSessions(...removed);
          toast.info(
            "",
            `${removed.length} session${removed.length > 1 ? "s" : ""} removed`
          );
        }

        const unblocked = gotIds.filter(
          (id) => !getIn(r[id], "attributes.job-chunk")
        );
        if (unblocked.length) {
          updateSessions(
            unblocked.reduce((acc, curr) => ({ ...acc, [curr]: r[curr] }), {})
          );
          toast.info(
            "",
            `${unblocked.length} session${
              unblocked.length > 1 ? "s" : ""
            } updated`
          );
        }

        setCheckTimer(setTimeout(checkerCb, 1000));
      } catch (e) {
        toast.error("Error", e.message, false);
        setCheckTimer(null);
      }
    };

    asyncCheck();
  }, [blocked, bulk, server]);

  React.useEffect(
    () => () => {
      if (checkTimer) clearTimeout(checkTimer);
      setCheckTimer(null);
    },
    []
  );

  React.useEffect(() => {
    if (!Array.isArray(blocked) || !blocked.length) return;
    setCheckTimer((current) => current || setTimeout(checkerCb, 1000));
  }, [blocked]);

  return null;
};

Checker.propTypes = {};

Checker.defaultProps = {};

export default Checker;
