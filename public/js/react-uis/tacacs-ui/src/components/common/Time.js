export const MS_IN_SEC = 1000;
export const MS_IN_MIN = MS_IN_SEC * 60;
export const MS_IN_HOUR = MS_IN_MIN * 60;

export const msToTime = ms => {
  const hr = parseInt(ms / MS_IN_HOUR);
  ms -= hr * MS_IN_HOUR;
  const mn = parseInt(ms / MS_IN_MIN);
  ms -= mn * MS_IN_MIN;
  const sc = parseInt(ms / MS_IN_SEC);
  ms -= sc * MS_IN_SEC;

  let r = [];
  if (hr) r.push(`${hr} h`);
  if (mn) r.push(`${mn} min`);
  if (sc) r.push(`${sc} sec`);
  if (ms || !r.length) r.push(`${ms} ms`);
  return r.join(" ");
};
