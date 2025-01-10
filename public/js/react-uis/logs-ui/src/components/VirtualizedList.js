import React from "react";
import PropTypes from "prop-types";
import { AutoSizer } from "react-virtualized/dist/es/AutoSizer";
import { List } from "react-virtualized/dist/es/List";
import { Input } from "react-cui-2.0";

import "react-virtualized/styles.css"; // only needs to be imported once

const OwnersList = ({ owners, owner, selectOwner }) => {
  const [showUsers, setShowUsers] = React.useState(true);
  const [filteredOwners, setFiltered] = React.useState([]);
  const [filter, setFilter] = React.useState("");

  const switchUsers = React.useCallback(() => setShowUsers((old) => !old), []);

  React.useEffect(() => {
    setFiltered(
      owners.filter((o) => {
        if (showUsers) {
          if (
            /^_/.test(o.owner) ||
            /(__watcher|__generator|__udp_server|__api)$/.test(o.owner)
          )
            return false;

          if (filter) return o.owner.includes(filter);
          return true;
        }
        return /^_/.test(o.owner);
      })
    );
  }, [owners, showUsers, filter]);

  const applyFilter = () => {};

  return (
    <div
      className="position-sticky base-sticky-top flex flex-column"
      style={{ height: "100%" }}
    >
      <div className="base-margin-left hidden-sm-down half-margin-bottom">
        <div className="subheader no-margin-bottom">
          {showUsers ? "Users" : "System"}
          {` (${filteredOwners.length})`}
        </div>
        <a className="text-small" onClick={switchUsers}>
          {"Switch to "}
          {showUsers ? "system" : "users"}
        </a>
      </div>
      {showUsers ? (
        <div className="panel panel--bordered-right panel--compressed half-padding-left half-padding-right">
          <Input
            type="search"
            name="filter"
            placeholder="Filter"
            icon="search"
            iconClick={() => applyFilter}
            field={{
              onChange: (e) => setFilter(e.target.value),
              onKeyDown: (e) => {
                if (e.keyCode === 13) applyFilter();
              },
              value: filter,
              name: "filter",
            }}
            form={{
              touched: {},
              errors: {},
            }}
          />
        </div>
      ) : null}
      <ul className="tabs tabs--vertical flex-fill all-children">
        <AutoSizer>
          {({ height, width }) => (
            <List
              height={height}
              rowCount={filteredOwners.length}
              rowHeight={37}
              rowRenderer={({ key, index, style }) => {
                const o = filteredOwners[index];
                return (
                  <li
                    className={`tab${owner.name === o.owner ? " active" : ""}`}
                    key={key}
                    style={style}
                  >
                    <a
                      className="flex bulk-link"
                      onClick={() => selectOwner(o.owner)}
                    >
                      <div className="tab__heading text-left flex-fluid half-margin-right">
                        {o.owner === "none" ? "Non-bulked" : o.owner}
                      </div>
                    </a>
                  </li>
                );
              }}
              width={width}
            />
          )}
        </AutoSizer>
      </ul>
    </div>
  );
};

OwnersList.propTypes = {
  owners: PropTypes.arrayOf(PropTypes.shape({})).isRequired,
  owner: PropTypes.string,
  selectOwner: PropTypes.func.isRequired,
};

OwnersList.defaultProps = {
  owner: null,
};

export default OwnersList;
