import React from "react";
import PropTypes from "prop-types";

import { Checkbox, Spinner as Loader, Alert } from "react-cui-2.0";

import { SelectionCheckbox } from "../../general/SelectionCheckbox";
import { ServersContext } from "../../../contexts";

const TableHead = () => (
  <ServersContext.Consumer>
    {({ selectAll, clearSelection, servers, selected }) => (
      <thead>
        <tr>
          <th className="checkbox-only">
            <Checkbox
              field={{
                onChange: (e) =>
                  e.target.checked ? selectAll() : clearSelection(),
                name: "scep-servers-all",
              }}
              form={{
                touched: {},
                error: {},
                values: {
                  "scep-servers-all": !servers.filter(
                    (s) => !selected.includes(s.id)
                  ).length,
                },
              }}
            />
          </th>
          <th>Name</th>
          <th>URL</th>
        </tr>
      </thead>
    )}
  </ServersContext.Consumer>
);

const ServersTable = ({ state }) => {
  const { servers, select, deselect, selected } = React.useContext(
    ServersContext
  );

  if (state.isLoading)
    return (
      <div className="flex-center base-margin-top dbl-margin-bottom">
        <Loader />
      </div>
    );

  if (state.isRejected)
    return (
      <div className="flex-center base-margin-top dbl-margin-bottom">
        <Alert.Error>Something went wrong.</Alert.Error>
      </div>
    );

  if (!Array.isArray(servers) || !servers.length)
    return (
      <div className="flex-center base-margin-top dbl-margin-bottom">
        No servers saved.
      </div>
    );

  return (
    <div className="responsive-table base-margin-top dbl-margin-bottom">
      <table className="table table--compressed table--bordered table--highlight table--nostripes table--wrap table--sortable">
        <TableHead />
        <tbody>
          {servers.map((server) => (
            <tr key={server.id}>
              <td>
                <SelectionCheckbox
                  id={server.id}
                  selected={selected}
                  select={select}
                  deselect={deselect}
                />
              </td>
              <td>{server.name}</td>
              <td>{server.url}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

ServersTable.propTypes = {
  state: PropTypes.shape({
    isLoading: PropTypes.bool,
    isResolved: PropTypes.bool,
    isRejected: PropTypes.bool,
  }).isRequired,
};

ServersTable.defaultProps = {};

export default ServersTable;
