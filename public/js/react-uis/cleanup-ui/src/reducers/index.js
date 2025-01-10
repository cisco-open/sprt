export const PROCS_ACTION = {
  UPD: "procs.update",
  CLR: "procs.clear"
};

export const PROCS_INIT = {
  total: 0,
  peruser: []
};

export const procsReducer = (state, { type, payload }) => {
  switch (type) {
    case PROCS_ACTION.UPD:
      return payload;
    case PROCS_ACTION.CLR:
      return PROCS_INIT;
    default:
      return state;
  }
};
