import React from "react";
import { Link, useParams } from "react-router-dom";
import { useAsync, IfPending, IfFulfilled, IfRejected } from "react-async";

import { toast } from "react-cui-2.0";

import { getHealth } from "../actions";
import { HealthContext } from "../contexts";

import { tabData, pathPrefix } from "./tabData";

const HealthChecker = ({ what }) => {
  const {
    updateTrigger: { [what]: trigger },
  } = React.useContext(HealthContext);
  const loadState = useAsync({
    promiseFn: getHealth,
    what,
    watch: trigger,
  });

  return (
    <>
      <IfPending state={loadState}>
        <span className="icon-animation spin half-margin-left half-margin-right" />
      </IfPending>
      <IfRejected state={loadState}>
        {(error) => {
          toast.error("Health check failed", error.message);
          return (
            <span className="icon-error-outline text--danger half-margin-left half-margin-right" />
          );
        }}
      </IfRejected>
      <IfFulfilled state={loadState}>
        {({ result }) => {
          if (!result || !result.level)
            return (
              <span
                className="icon-question-circle half-margin-left half-margin-right"
                style={{ cursor: "pointer" }}
                onClick={() => loadState.reload}
              />
            );

          if (result.level === "success")
            return (
              <span className="text-success icon-check half-margin-left half-margin-right" />
            );

          return (
            <span
              className={`text-${result.level}${
                result.type === "icon" ? " icon-warning-outline" : ""
              } half-margin-left half-margin-right`}
            >
              {result.type === "icon" ? "" : result.value}
            </span>
          );
        }}
      </IfFulfilled>
    </>
  );
};

export const Tabs = () => {
  const { tab } = useParams();
  const { triggerHealthUpdate } = React.useContext(HealthContext);

  return (
    <ul className="tabs tabs--vertical">
      {tabData.map((t) => (
        <li
          key={t.path}
          className={`tab ${tab && tab === t.path ? "active" : ""}`}
        >
          <Link
            to={`${pathPrefix}/${t.path}/`}
            onClick={() => triggerHealthUpdate(t.path)}
            className="flex"
          >
            <div className="flex-fluid text-left">{t.title}</div>
            {t.checker ? (
              typeof t.checker === "boolean" ? (
                <HealthChecker what={t.path} />
              ) : (
                t.checker
              )
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
};
