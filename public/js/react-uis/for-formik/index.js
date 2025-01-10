import isEqual from "react-fast-compare";
import deepmerge from "deepmerge";
import invariant from "tiny-warning";
import scheduler from "scheduler";
import hoistNonReactStatics from "hoist-non-react-statics";
import isPlainObject from "lodash-es/isPlainObject";
import clone from "lodash-es/clone";
import toPath from "lodash-es/toPath";
import cloneDeep from "lodash-es/cloneDeep";

window.isEqual = isEqual;
window.deepmerge = deepmerge;
window.isPlainObject = isPlainObject;
window.clone = clone;
window.toPath = toPath;
window.invariant = invariant;
window.scheduler = scheduler;
window.hoistNonReactStatics = hoistNonReactStatics;
window.cloneDeep = cloneDeep;
