import React from "react";
import { Field, connect, getIn } from "formik";

import { Input, Radio, Select, Switch, Alert } from "react-cui-2.0";
import { VariantSelectorFormik } from "my-composed/VariantSelectorFormik";

const CronContext = React.createContext({});

export const HoursMinutes = connect(
  ({ formik, prefix, disabled, initHour, initMinute }) => {
    React.useEffect(() => {
      formik.setFieldValue(
        `${prefix}.hour`,
        getIn(formik.values, `${prefix}.hour`, initHour || "12"),
        false
      );
      formik.setFieldValue(
        `${prefix}.minute`,
        getIn(formik.values, `${prefix}.minute`, initMinute || "00"),
        false
      );

      return () => {
        formik.setFieldValue(`${prefix}.hour`, undefined, false);
        formik.unregisterField(`${prefix}.hour`);
        formik.setFieldValue(`${prefix}.minute`, undefined, false);
        formik.unregisterField(`${prefix}.minute`);
      };
    }, []);

    return (
      <>
        <Field
          component={Select}
          name={`${prefix}.hour`}
          inline="both"
          title={null}
          prompt="Hour"
          id={`${prefix}.hour`}
          className="half-margin-left qtr-margin-right no-margin-top"
          disabled={disabled}
          width={70}
        >
          {Array.from(
            new Array(24),
            (_, index) => `${index.toString().padStart(2, "0")}`
          ).map((h) => (
            <option id={h} value={h} key={h}>
              {h}
            </option>
          ))}
        </Field>
        :
        <Field
          component={Select}
          name={`${prefix}.minute`}
          inline="both"
          title={null}
          prompt="minute"
          id={`${prefix}.hour`}
          className="qtr-margin-left qtr-margin-right no-margin-top"
          disabled={disabled}
          width={70}
        >
          {Array.from(
            new Array(60),
            (_, index) => `${index.toString().padStart(2, "0")}`
          ).map((h) => (
            <option id={h} value={h} key={h}>
              {h}
            </option>
          ))}
        </Field>
      </>
    );
  }
);

export const CronMinutes = connect(({ formik }) => {
  const { prefix } = React.useContext(CronContext);
  React.useEffect(() => {
    formik.setFieldValue(
      `${prefix}.minutes`,
      getIn(formik.values, `${prefix}.minutes`, 10),
      false
    );

    return () => {
      formik.setFieldValue(`${prefix}.minutes`, undefined, false);
      formik.unregisterField(`${prefix}.minutes`);
    };
  }, []);

  return (
    <div className="animated fadeIn fast">
      <div className="half-margin-bottom">
        Every
        <Field
          component={Input}
          className="qtr-margin-left qtr-margin-right no-margin-top"
          name={`${prefix}.minutes`}
          type="number"
          min={1}
          max={59}
          inline="both"
          validate={(v) => {
            if (Number.isNaN(parseInt(v, 10))) return "Required";
            if (parseInt(v, 10) < 1 || parseInt(v, 10) > 59) return "Incorrect";
            return undefined;
          }}
        />
        minute(s).
      </div>
    </div>
  );
});

export const CronHours = connect(({ formik }) => {
  const { prefix } = React.useContext(CronContext);
  React.useEffect(() => {
    formik.setFieldValue(
      `${prefix}.how`,
      getIn(formik.values, `${prefix}.how`, "every"),
      false
    );
    formik.setFieldValue(
      `${prefix}.hours`,
      getIn(formik.values, `${prefix}.hours`, 2),
      false
    );

    return () => {
      formik.setFieldValue(`${prefix}.how`, undefined, false);
      formik.unregisterField(`${prefix}.how`);
      formik.setFieldValue(`${prefix}.hours`, undefined, false);
      formik.unregisterField(`${prefix}.hours`);
    };
  }, []);

  return (
    <div className="animated fadeIn fast row">
      <div className="flex flex-center-vertical half-margin-bottom col-md-6 col-12">
        <Field
          component={Radio}
          label={null}
          id="every"
          inline
          name={`${prefix}.how`}
          className="half-margin-right"
        />
        Every
        <Field
          component={Input}
          className="qtr-margin-left qtr-margin-right no-margin-top"
          name={`${prefix}.hours`}
          type="number"
          min={1}
          max={23}
          inline="both"
          helpBlock={false}
          disabled={getIn(formik.values, `${prefix}.how`, "every") !== "every"}
          validate={(v) => {
            if (Number.isNaN(parseInt(v, 10))) return "Required";
            if (parseInt(v, 10) < 1 || parseInt(v, 10) > 23) return "Incorrect";
            return undefined;
          }}
        />
        hour(s).
      </div>
      <div className="flex flex-center-vertical col-md-6 col-12">
        <Field
          component={Radio}
          label={null}
          id="at"
          inline
          name={`${prefix}.how`}
          className="half-margin-right"
        />
        At
        <HoursMinutes
          prefix={prefix}
          disabled={getIn(formik.values, `${prefix}.how`, "every") !== "at"}
        />
      </div>
    </div>
  );
});

export const CronDays = connect(({ formik }) => {
  const { prefix } = React.useContext(CronContext);
  React.useEffect(() => {
    formik.setFieldValue(
      `${prefix}.days`,
      getIn(formik.values, `${prefix}.days`, 1),
      false
    );

    return () => {
      formik.setFieldValue(`${prefix}.days`, undefined, false);
      formik.unregisterField(`${prefix}.days`);
    };
  }, []);

  return (
    <div className="animated fadeIn fast">
      <div className="half-margin-bottom">
        Every
        <Field
          component={Input}
          className="qtr-margin-left qtr-margin-right no-margin-top"
          name={`${prefix}.days`}
          type="number"
          min={1}
          max={31}
          inline="both"
          validate={(v) => {
            if (Number.isNaN(parseInt(v, 10))) return "Required";
            if (parseInt(v, 10) < 1 || parseInt(v, 10) > 31) return "Incorrect";
            return undefined;
          }}
        />
        day(s). Start at
        <HoursMinutes prefix={prefix} />
      </div>
    </div>
  );
});

export const CronWeeks = connect(({ formik }) => {
  const { prefix } = React.useContext(CronContext);
  React.useEffect(() => {
    formik.setFieldValue(
      `${prefix}.weekdays`,
      getIn(formik.values, `${prefix}.weekdays`, { mon: true }),
      false
    );

    return () => {
      formik.setFieldValue(`${prefix}.weekdays`, undefined, false);
      formik.unregisterField(`${prefix}.weekdays`);
    };
  }, []);

  return (
    <div className="animated fadeIn faster">
      <div className="half-margin-bottom">
        {[
          ["Monday", "mon"],
          ["Tuesday", "tue"],
          ["Wednesday", "wed"],
          ["Thursday", "thu"],
          ["Friday", "fri"],
          ["Saturday", "sat"],
          ["Sunday", "sun"],
        ].map((day) => (
          <Field
            component={Switch}
            key={day[0]}
            right={day[0]}
            name={`${prefix}.weekdays.${day[1]}`}
            validate={() => {
              const d = getIn(formik.values, `${prefix}.weekdays`, {});
              if (
                !Object.keys(d).length ||
                !Object.keys(d).reduce((prev, v) => prev || d[v], false)
              )
                return "At least one day must be selected";
              return undefined;
            }}
          />
        ))}
      </div>
      {getIn(formik.errors, `${prefix}.weekdays`, undefined) ? (
        <div className="half-margin-bottom animated faster fadeIn">
          <Alert.Error>At least one day must be selected.</Alert.Error>
        </div>
      ) : null}
      <div className="flex flex-center-vertical">
        Start at
        <HoursMinutes prefix={prefix} />
      </div>
    </div>
  );
});

export const ByCron = connect(({ formik, prefix, title }) => {
  React.useEffect(() => {
    formik.setFieldValue(
      `${prefix}.variant`,
      getIn(formik.values, `${prefix}.variant`, "hours"),
      false
    );

    return () => {
      formik.setFieldValue(`${prefix}.variant`, undefined, false);
      formik.unregisterField(`${prefix}.variant`);
    };
  }, []);

  return (
    <div className="animated fadeIn fast">
      <CronContext.Provider value={{ prefix }}>
        <VariantSelectorFormik
          variants={[
            {
              variant: "minutes",
              display: "Minutes",
              component: <CronMinutes />,
            },
            {
              variant: "hours",
              display: "Hours",
              component: <CronHours />,
            },
            {
              variant: "days",
              display: "Days",
              component: <CronDays />,
            },
            {
              variant: "weeks",
              display: "Week days",
              component: <CronWeeks />,
            },
          ]}
          varPrefix={prefix}
          title={title || "Repeat on:"}
        />
      </CronContext.Provider>
    </div>
  );
});

const cronDispatcher = {
  minutes: (obj) => `0/${obj.minutes} * * * *`,
  hours: (obj) => {
    switch (obj.how) {
      case "every":
        return `0 0/${obj.hours} 1/1 * *`;
      case "at":
        return `${obj.minute} ${obj.hour} 1/1 * *`;
      default:
        return "* * * * *";
    }
  },
  days: (obj) => `${obj.minute} ${obj.hour} 1/${obj.days} * *`,
  weeks: (obj) =>
    `${obj.minute} ${obj.hour} * * ${Object.keys(obj.weekdays)
      .filter((k) => obj.weekdays[k])
      .map((d) => d.toUpperCase())
      .join(",")}`,
  default: () => "",
};

export const objToCron = (obj) =>
  (cronDispatcher[obj.variant] || cronDispatcher.default)(obj);
