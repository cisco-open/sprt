import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { DateTime } from "luxon";
import { IfPending, IfFulfilled, IfRejected } from "react-async";
import { getIn } from "formik";

import { Spinner as Loader, Alert, Tab, TabsHeader } from "react-cui-2.0";

import { ErrorDetails } from "my-utils";

const DataContext = React.createContext([]);

const tabs = [
  {
    name: "delays",
    label: "Delays",
    y: "Delay (ms)",
    x: "Delay",
    avg: "Average delay",
    unit: "ms",
  },
  {
    name: "lengths",
    label: "Durations",
    y: "Duration (ms)",
    x: "Duration",
    avg: "Average duration",
    unit: "ms",
  },
  {
    name: "retransmits",
    label: "Retransmits",
    y: "Retransmits",
    x: "Retransmits",
    avg: "",
    unit: null,
  },
];

const CustomTooltip = ({ payload }) => {
  return (
    <div className="toast toast--regular">
      <div className="toast__body">
        <div className="toast__message">
          <ul className="list">
            {payload.map((p) => (
              <li key={p.dataKey}>
                <span style={{ color: p.color }}>{`${p.name}: `}</span>
                {`${p.value.toFixed(3)} ${p.unit}`}
              </li>
            ))}
            {payload.length && payload[0].payload.name ? (
              <li>
                <span>Time: </span>
                {DateTime.fromMillis(
                  parseInt(parseFloat(payload[0].payload.name) * 1000, 10)
                ).toFormat("HH:mm:ss.SSS")}
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
};

const CustomizedAxisTick = ({ x, y, payload }) => {
  if (!payload.value) return null;
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={0}
        dy={16}
        textAnchor="end"
        fill="#666"
        transform="rotate(-35)"
      >
        {DateTime.fromMillis(
          parseInt(parseFloat(payload.value) * 1000, 10)
        ).toFormat("HH:mm:ss.SSS")}
      </text>
    </g>
  );
};

const Body = ({ data, job }) => {
  const [tab, setTab] = React.useState(tabs[0]);

  const xProps = React.useMemo(() => {
    const d = getIn(data, `stats.lengths.new_style`, []);
    if (!d.length || !d[0].name) return { hide: true };
    return {
      tick: <CustomizedAxisTick />,
      height: 80,
    };
  }, [data]);

  return (
    <>
      <TabsHeader
        onTabChange={(newTab) => setTab(tabs.find((t) => t.name === newTab))}
        openTab={tab.name}
        bordered
        tabsClassName="half-margin-bottom"
      >
        {tabs.map((t) => (
          <Tab id={t.name} title={t.label} key={t.name}>
            {null}
          </Tab>
        ))}
      </TabsHeader>
      <DataContext.Provider
        value={{ data: getIn(data, `stats.${tab.name}.new_style`, []) }}
      >
        <ResponsiveContainer width="100%" height={500}>
          <LineChart
            data={getIn(data, `stats.${tab.name}.new_style`, [])}
            margin={{
              top: 5,
              right: 5,
              left: 5,
              bottom: 5,
            }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" {...xProps} />
            <YAxis
              label={{
                value: tab.y,
                angle: -90,
                position: "insideLeft",
              }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line
              type="monotoneX"
              dataKey="value"
              stroke="#6cc04a"
              name={tab.x}
              unit={tab.unit}
              activeDot={{
                r: 6,
                onClick: ({ payload }) => {
                  window.open(
                    `${globals.rest.sessions}?session_id=${payload.id}&proto=${job.attributes_decoded.protocol}`
                  );
                },
                style: { cursor: "pointer" },
              }}
            />
            {typeof getIn(
              data,
              `stats.${tab.name}.new_style.0.avg`,
              undefined
            ) !== "undefined" ? (
              <Line
                type="monotoneX"
                dataKey="avg"
                stroke="#fbab18"
                name={tab.avg}
                unit={tab.unit}
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </DataContext.Provider>
    </>
  );
};

export default ({ job, statsLoading }) => (
  <>
    <IfPending state={statsLoading}>
      <Loader text="Loading stats..." />
    </IfPending>
    <IfRejected state={statsLoading}>
      {(error) => (
        <Alert type="error" title="Operation failed">
          {"Couldn't get jobs data: "}
          {error.message}
          <ErrorDetails error={error} />
        </Alert>
      )}
    </IfRejected>
    <IfFulfilled state={statsLoading}>
      {(data) => <Body job={job} data={data} />}
    </IfFulfilled>
  </>
);
