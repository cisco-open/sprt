import React from "react";

import { Pagination, Dropdown } from "react-cui-2.0";

export const TablePagination = ({ paging, updPaging }) => {
  if (!paging || !Object.keys(paging).length || !paging.total) return null;

  return (
    <>
      <div className="flex-center-vertical">
        <span className="qtr-margin-right">Page:</span>
        <Pagination
          size="small"
          icons
          position={paging.offset}
          total={paging.total}
          perPage={paging.limit}
          onPageChange={(_e, offset) => updPaging({ offset })}
          firstAndLast={false}
          beginAt={0}
          className="no-margin-top"
        />
        <div className="v-separator" />
        <span className="qtr-margin-right">Per page:</span>
        <Dropdown type="link" header={paging.limit} alwaysClose openTo="left">
          {[10, 25, 50, 100, 250, 500].map((v) => (
            <a
              key={`per-page-${v}`}
              className={v === paging.limit ? "selected" : ""}
              onClick={() => updPaging({ limit: v })}
            >
              {v}
            </a>
          ))}
        </Dropdown>
      </div>
    </>
  );
};
