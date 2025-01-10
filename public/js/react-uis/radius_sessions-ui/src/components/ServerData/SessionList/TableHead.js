import React from "react";

import { Checkbox } from "react-cui-2.0";

import { SessionsContext } from "../../../contexts";

const switchOrder = (o) => (o === "DESC" ? "ASC" : "DESC");

const sortableColumns = [
  { name: "mac", title: "MAC" },
  { name: "user", title: "User" },
  { name: "sessid", title: "Session ID" },
  { name: "ipAddr", title: "IP Address" },
  { name: "started", title: "Session started" },
  { name: "changed", title: "Last update" },
];

export const TableHead = () => (
  <SessionsContext.Consumer>
    {({
      sessions,
      paging,
      updPaging,
      selection: { selected, selectAll, deselectAll },
    }) => (
      <thead>
        <tr>
          <th>
            <Checkbox
              field={{
                onChange: (e) =>
                  e.target.checked ? selectAll() : deselectAll(),
                name: "radius-all",
              }}
              form={{
                touched: {},
                error: {},
                values: {
                  "radius-all": !sessions.filter(
                    (s) => !selected.includes(s.id)
                  ).length,
                },
              }}
            />
          </th>
          <th>Details</th>
          <th>State</th>
          {sortableColumns.map((c) => (
            <th
              className={`sortable${paging.column === c.name ? " sorted" : ""}`}
              key={c.name}
              onClick={() =>
                updPaging({
                  column: c.name,
                  order:
                    paging.column === c.name
                      ? switchOrder(paging.order)
                      : "DESC",
                })
              }
            >
              {c.title}
              {paging.column === c.name ? (
                <span
                  className={`sort-indicator icon-sort-amount-${paging.order.toLowerCase()}`}
                />
              ) : null}
            </th>
          ))}
        </tr>
      </thead>
    )}
  </SessionsContext.Consumer>
);
