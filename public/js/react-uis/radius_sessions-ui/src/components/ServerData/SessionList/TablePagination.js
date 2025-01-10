import React from "react";

import { Pagination } from "react-cui-2.0";

import { SessionsContext } from "../../../contexts";

export const TablePagination = () => {
  const { paging, updPaging } = React.useContext(SessionsContext);

  if (!paging || !Object.keys(paging).length || !paging.total) return null;

  return (
    <>
      <div className="pull-right">
        Per page:&nbsp;
        <ul className="pagination pagination--small">
          {[10, 25, 50, 100, 500, 1000].map((v) => (
            <li key={v} className={paging.limit === v ? "active" : ""}>
              <a onClick={() => updPaging({ limit: v })}>{v}</a>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex-center-vertical">
        <span className="qtr-margin-right base-margin-top">Page:</span>
        <Pagination
          size="small"
          icons
          position={paging.offset}
          total={paging.total}
          perPage={paging.limit}
          onPageChange={(e, offset) => updPaging({ offset })}
          firstAndLast={false}
          beginAt={0}
        />
      </div>
    </>
  );
};
