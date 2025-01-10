import React from "react";
import PropTypes from "prop-types";

const PaginationContext = React.createContext({});

const Button = ({ active, content, disabled, position }) => (
  <PaginationContext.Consumer>
    {({ changePage }) => (
      <li className={active ? "active" : ""}>
        <a
          className={disabled ? "disabled" : ""}
          onClick={e => changePage(e, position)}
        >
          {content}
        </a>
      </li>
    )}
  </PaginationContext.Consumer>
);

const FirstPrev = () => {
  const {
    perPage,
    firstAndLast,
    position,
    icons,
    prev,
    beginAt
  } = React.useContext(PaginationContext);
  const disabled = position < parseInt(perPage) + parseInt(beginAt);

  let r = [];
  if (icons && firstAndLast)
    r.push(
      <Button
        content={<span className="icon-chevron-left-double" />}
        disabled={disabled}
        key="first-page"
        position={beginAt}
      />
    );

  r.push(
    <Button
      content={icons ? <span className="icon-chevron-left" /> : prev}
      disabled={disabled}
      key="previous-page"
      position={parseInt(position) - parseInt(perPage)}
    />
  );

  return r;
};

const NextLast = () => {
  const {
    beginAt,
    perPage,
    total,
    firstAndLast,
    position,
    icons,
    next
  } = React.useContext(PaginationContext);
  const pages = Math.floor(total / perPage) + 1;
  const disabled =
    position > parseInt(total) - parseInt(perPage) + parseInt(beginAt);

  let r = [];
  r.push(
    <Button
      content={icons ? <span className="icon-chevron-right" /> : next}
      disabled={disabled}
      key="next-page"
      position={parseInt(position) + parseInt(perPage)}
    />
  );

  if (icons && firstAndLast)
    r.push(
      <Button
        content={<span className="icon-chevron-right-double" />}
        disabled={disabled}
        key="last-page"
        position={(parseInt(pages) - 1) * parseInt(perPage) + parseInt(beginAt)}
      />
    );

  return r;
};

const Pages = ({ start, finish }) => (
  <PaginationContext.Consumer>
    {({ perPage, active, beginAt }) =>
      [...Array(parseInt(finish) - parseInt(start) + 1)].map((v, i) => {
        const current = parseInt(start) + i;
        return (
          <Button
            active={active === current}
            content={`${current}`}
            key={`${current}-page`}
            position={
              (parseInt(current) - 1) * parseInt(perPage) + parseInt(beginAt)
            }
          />
        );
      })
    }
  </PaginationContext.Consumer>
);

const Pagination = ({
  size,
  bordered,
  icons,
  next,
  prev,
  position,
  perPage,
  total,
  onPageChange,
  innerRef,
  className,
  firstAndLast,
  beginAt,
  ...rest
}) => {
  const pages = Math.ceil(total / perPage);
  const active = Math.floor(position / perPage) + 1;

  const changePage = (e, newPosition) => {
    if (typeof onPageChange === "function")
      onPageChange(e, parseInt(newPosition));
  };

  return (
    <PaginationContext.Provider
      value={{
        active,
        beginAt,
        changePage,
        firstAndLast,
        icons,
        next,
        perPage,
        position,
        prev,
        total
      }}
    >
      <ul
        className={
          `pagination` +
          (size !== "default" ? ` pagination--${size}` : "") +
          (bordered ? " pagination--bordered" : "") +
          (className ? ` ${className}` : "")
        }
        ref={innerRef}
        {...rest}
      >
        <FirstPrev />
        {active < 4 || pages === 4 ? (
          <>
            <Pages start={1} finish={Math.min(pages, 4)} />
            {pages > 4 ? (
              <>
                <li>
                  <span className="icon-more" />
                </li>
                <Button
                  content={pages}
                  key={`${pages}-page`}
                  position={
                    (parseInt(pages) - 1) * parseInt(perPage) +
                    parseInt(beginAt)
                  }
                />
              </>
            ) : null}
          </>
        ) : (
          <>
            <Button
              active={active === beginAt}
              content="1"
              key={`1-page`}
              position={beginAt}
            />
            <li>
              <span className="icon-more" />
            </li>
            {active < pages - 2 ? (
              <>
                <Pages
                  start={parseInt(active) - 1}
                  finish={parseInt(active) + 1}
                />
                <li>
                  <span className="icon-more" />
                </li>
                <Button
                  active={active === pages}
                  content={pages}
                  key={`${pages}-page`}
                  position={
                    (parseInt(pages) - 1) * parseInt(perPage) +
                    parseInt(beginAt)
                  }
                />
              </>
            ) : (
              <Pages start={parseInt(pages) - 3} finish={pages} />
            )}
          </>
        )}
        <NextLast />
      </ul>
    </PaginationContext.Provider>
  );
};

Pagination.propTypes = {
  size: PropTypes.oneOf(["small", "default", "large"]),
  bordered: PropTypes.bool,
  icons: PropTypes.bool,
  next: PropTypes.node,
  prev: PropTypes.node,
  position: PropTypes.number.isRequired,
  perPage: PropTypes.number,
  total: PropTypes.number.isRequired,
  onPageChange: PropTypes.func,
  firstAndLast: PropTypes.bool,
  beginAt: PropTypes.number
};

Pagination.defaultProps = {
  beginAt: 1,
  bordered: false,
  firstAndLast: true,
  icons: false,
  next: "Next",
  perPage: 1,
  prev: "Previous",
  size: "default"
};

const refPagination = React.forwardRef((props, ref) => (
  <Pagination innerRef={ref} {...props} />
));
export { refPagination as Pagination };
