import React from "react";

import { SessionsContext } from "../../contexts";

import { TablePagination } from "./TablePagination";
import { SessionState } from "./SessionState";
import { SessionCheckbox } from "./SessionCheckbox";
import { TableHead } from "./TableHead";
import { SessionDetails } from "./SessionDetails";
import { SessionCreds } from "./SessionCreds";

export const NoSessions = () => <div>No sessions</div>;

export const SessionsTable = ({ tableRef }) => {
  const { sessions } = React.useContext(SessionsContext);

  if (!sessions.length) return <NoSessions />;

  return (
    <div className="responsive-table base-margin-top dbl-margin-bottom">
      <table
        className="table table--compressed table--bordered table--highlight table--nostripes table--wrap table--sortable"
        ref={tableRef}
      >
        <TableHead />
        <tbody>
          {sessions.map((s) => (
            <tr key={s.id}>
              <td className="checkbox-only">
                <SessionCheckbox id={s.id} />
              </td>
              <td className="text-center">
                <SessionDetails session={s} />
                <SessionCreds session={s} />
              </td>
              <td className="state text-center">
                <SessionState session={s} />
              </td>
              <td>{s.user}</td>
              <td>{s.ip_addr}</td>
              <td>{s.started_f}</td>
              <td>{s.changed_f}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TablePagination />
    </div>
  );
};
