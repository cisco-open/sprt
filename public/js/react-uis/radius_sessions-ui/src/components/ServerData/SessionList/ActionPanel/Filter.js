import React from "react";

import { Button, ButtonGroup, Input, Icon } from "react-cui-2.0";

import { SessionsContext } from "../../../../contexts";

const Filter = () => {
  const { paging, updPaging } = React.useContext(SessionsContext);
  const [filter, setFilter] = React.useState(
    typeof paging === "object" ? paging.filter || "" : ""
  );

  const applyFilter = () => {
    if (!filter.trim() && !paging.filter) return;
    updPaging({ filter: filter.trim() }, false);
  };

  return (
    <>
      <Input
        type="text"
        name="filter"
        inline="both"
        placeholder="Filter"
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
      <ButtonGroup square>
        <Button.Link onClick={applyFilter} icon>
          <Icon icon="filter" />
        </Button.Link>
      </ButtonGroup>
    </>
  );
};

export default Filter;
