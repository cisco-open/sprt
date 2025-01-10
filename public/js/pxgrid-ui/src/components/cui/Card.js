import React from "react";
import PropTypes from "prop-types";

const CardHeader = ({
  title,
  subtitle,
  children,
  innerRef,
  className,
  titleComponent,
  titleClassName,
  ...rest
}) => (
  <div
    className={"card__header" + (className ? ` ${className}` : "")}
    ref={innerRef}
    {...rest}
  >
    {title
      ? React.createElement(
          titleComponent || "h4",
          {
            className: `card__title${
              titleClassName ? ` ${titleClassName}` : ""
            }`
          },
          title
        )
      : null}
    {subtitle ? <div className="card__subtitle">{subtitle}</div> : null}
    {children}
  </div>
);

CardHeader.propTypes = {
  title: PropTypes.node,
  titleComponent: PropTypes.string,
  titleClassName: PropTypes.string,
  subtitle: PropTypes.string
};

CardHeader.defaultProps = {
  titleComponent: "h4"
};

const refCardHeader = React.forwardRef((props, ref) => (
  <CardHeader innerRef={ref} {...props} />
));
export { refCardHeader as CardHeader };

const CardBody = ({ className, innerRef, children, ...rest }) => (
  <div
    className={"card__body" + (className ? ` ${className}` : "")}
    ref={innerRef}
    {...rest}
  >
    {children}
  </div>
);

const refCardBody = React.forwardRef((props, ref) => (
  <CardBody innerRef={ref} {...props} />
));
export { refCardBody as CardBody };

const CardFooter = ({ className, innerRef, children, ...rest }) => (
  <div
    className={"card__footer" + (className ? ` ${className}` : "")}
    ref={innerRef}
    {...rest}
  >
    {children}
  </div>
);

const refCardFooter = React.forwardRef((props, ref) => (
  <CardFooter innerRef={ref} {...props} />
));
export { refCardFooter as CardFooter };

const CardFooterItem = ({ className, innerRef, children, ...rest }) => (
  <div
    className={"card__footer__item" + (className ? ` ${className}` : "")}
    ref={innerRef}
    {...rest}
  >
    {children}
  </div>
);

const refCardFooterItem = React.forwardRef((props, ref) => (
  <CardFooterItem innerRef={ref} {...props} />
));
export { refCardFooterItem as CardFooterItem };

const Card = ({
  align,
  raised,
  selected,
  title,
  subtitle,
  children,
  innerRef,
  className,
  ...rest
}) => (
  <div
    className={
      "card" +
      (align !== "left" ? ` card--${align}` : "") +
      (raised ? " card--raised" : "") +
      (selected ? " selected" : "") +
      (className ? ` ${className}` : "")
    }
    ref={innerRef}
    {...rest}
  >
    {title || subtitle ? (
      <CardHeader title={title} subtitle={subtitle} />
    ) : null}
    {children}
  </div>
);

Card.propTypes = {
  align: PropTypes.oneOf(["left", "centered", "right"]),
  raised: PropTypes.bool,
  selected: PropTypes.bool,
  title: PropTypes.string,
  subtitle: PropTypes.string
};

Card.defaultProps = {
  align: "left",
  raised: false,
  selected: false
};

const refCard = React.forwardRef((props, ref) => (
  <Card innerRef={ref} {...props} />
));
export { refCard as Card };
