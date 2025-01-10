import React from "react";
import PropTypes from "prop-types";

import { SessionsContext } from "../../../contexts";

import { TablePagination } from "./TablePagination";
import { SessionState } from "./SessionState";
import { SessionCheckbox } from "./SessionCheckbox";
import { TableHead } from "./TableHead";
import { SessionDetails } from "./SessionDetails";
import { FlowModalListner } from "./SessionDetails/FlowModal";
import { DACLModalListner } from "./SessionDetails/DACLModal";
import { CertModalListner } from "./SessionDetails/CertModal";
import { GuestModalListner } from "./SessionDetails/GuestModal";

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
              <td className="text-center" style={{ whiteSpace: "nowrap" }}>
                <SessionDetails session={s} />
              </td>
              <td className="state text-center">
                <SessionState session={s} />
              </td>
              <td>{s.mac}</td>
              <td>{s.user}</td>
              <td>{s.sessid}</td>
              <td>{s.ipAddr}</td>
              <td>{s.started_f}</td>
              <td>{s.changed_f}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <TablePagination />
      <FlowModalListner />
      <DACLModalListner />
      <CertModalListner />
      <GuestModalListner />
    </div>
  );
};

SessionsTable.propTypes = {
  tableRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({ current: PropTypes.any }),
  ]).isRequired,
};
