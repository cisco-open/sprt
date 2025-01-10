export const BLOCK_MULTI = "block.multi";
export const BLOCK_ONE = "block.one";
export const UNBLOCK_MULTI = "unblock.multi";
export const UNBLOCK_ONE = "unblock.one";

export const blockedJobsReducer = (state, { type, payload }) => {
  switch (type) {
    case BLOCK_MULTI:
      const n = {
        ...state,
        ...payload.jobs.reduce((obj, j) => {
          obj[j] = payload.status || "loading";
          return obj;
        }, {})
      };
      return n;
    case BLOCK_ONE:
      return {
        ...state,
        [payload.job]: payload.status || "loading"
      };
    case UNBLOCK_MULTI:
      return Object.keys(state)
        .filter(key => !payload.jobs.includes(key))
        .reduce((obj, key) => {
          obj[key] = state[key];
          return obj;
        }, {});
    case UNBLOCK_ONE:
      delete state[payload.job];
      return { ...state };
    default:
      return state;
  }
};

export const WATCH = {
  ADD: "watch.add",
  DEL: "watch.delete",
  CLR: "watch.clear"
};

export const watchedJobsReducer = (state, { type, payload }) => {
  switch (type) {
    case WATCH.ADD:
      return state.includes(payload) ? state : [...state, payload];
    case WATCH.DEL:
      return state.includes(payload)
        ? state.filter(id => id !== payload)
        : state;
    case WATCH.CLR:
      return [];
    default:
      return state;
  }
};

export const JOBS = {
  NEW: "jobs.new",
  NEW_FROM_DATA: "jobs.new_from_data",
  UPD: "jobs.update",
  DEL: "jobs.delete"
};

const prepareJob = j => {
  j.date = new Date(
    parseInt(`${j.attributes_decoded.created}000`)
  ).toDateString();

  j.success = !j.running && j.percentage == 100;
  j.fail = !j.running && !j.success && j.pid;
};

const sortJobs = (a, b) => {
  return -(a.attributes_decoded.created - b.attributes_decoded.created);
};

export const jobsReducer = (state, { type, payload }) => {
  switch (type) {
    case JOBS.NEW:
      return payload;

    case JOBS.NEW_FROM_DATA:
      const js =
        Array.isArray(payload.jobs) && payload.jobs.length ? payload.jobs : [];

      if (Array.isArray(payload.running) && payload.running.length)
        payload.running.forEach(jid => (js[jid].running = true));

      js.forEach(j => prepareJob(j));
      return js.sort(sortJobs);

    case JOBS.UPD:
      const received =
        Array.isArray(payload.jobs) && payload.jobs.length ? payload.jobs : [];

      received.forEach(j => {
        const ex = state.findIndex(s => s.id === j.id);
        if (ex < 0) return;
        prepareJob(j);
        state[ex] = j;
      });
      return [...state.sort(sortJobs)];

    case JOBS.DEL:
      if (Array.isArray(payload))
        return state.filter(j => !payload.includes(j.id));
      else return state.filter(j => j.id !== payload);

    default:
      return state;
  }
};

export const ARRANGE = {
  NONE: "none",
  DATE: "date",
  PROTOCOL: "protocol",
  SERVER: "server"
};

export const arrangeReducer = (state, { type, payload: { jobs } }) => {
  switch (type) {
    case ARRANGE.NONE:
      return null;
    case ARRANGE.DATE:
      return [...new Set(jobs.map(j => j.date))]
        .sort((a, b) => {
          a = new Date(a);
          b = new Date(b);
          if (a < b) {
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0;
        })
        .reverse()
        .map(u => ({
          cat: u,
          jobs: jobs
            .filter(j => j.date === u)
            .map(j => jobs.findIndex(comp => comp.id === j.id))
        }));
    case ARRANGE.PROTOCOL:
      return [...new Set(jobs.map(j => j.attributes_decoded.protocol))]
        .sort()
        .map(u => ({
          cat: u,
          jobs: jobs
            .filter(j => j.attributes_decoded.protocol === u)
            .map(j => jobs.findIndex(comp => comp.id === j.id))
        }));
    case ARRANGE.SERVER:
      return [...new Set(jobs.map(j => j.attributes_decoded.server))]
        .sort()
        .map(u => ({
          cat: u,
          jobs: jobs
            .filter(j => j.attributes_decoded.server === u)
            .map(j => jobs.findIndex(comp => comp.id === j.id))
        }));
    default:
      return state;
  }
};

export const CRONS = {
  NEW: "crons.new",
  NEW_FROM_DATA: "crons.new_from_data",
  UPD: "crons.update",
  DEL: "crons.delete",
  JOBS_DELETED: "crons.jobs_deleted"
};

export const cronsReducer = (state, { type, payload }) => {
  switch (type) {
    case CRONS.NEW:
      return payload;

    case CRONS.NEW_FROM_DATA:
      return payload.crons;

    case CRONS.DEL:
      return state.filter((c, idx) =>
        typeof payload.idx !== "undefined"
          ? idx !== payload.idx
          : typeof payload.line !== "undefined"
          ? c.line !== payload.line
          : true
      );

    case CRONS.UPD:
      return state.map((c, idx) => (idx === payload.idx ? payload.cron : c));

    case CRONS.JOBS_DELETED:
      const a = (Array.isArray(payload) ? payload : [payload]).map(id =>
        id.toLowerCase()
      );
      return state.filter(c => !a.includes(c.args.jid.toLowerCase()));

    default:
      return state;
  }
};
