export const ANIMATION_DONE_EVENT = "animation::done";
export const triggerAnimationDoneEvent = node =>
  node.dispatchEvent(new Event(ANIMATION_DONE_EVENT));

export const createOpacityAnimationConfig = (
  animatingIn,
  targetOpacity = 1
) => ({
  value: animatingIn ? [0, targetOpacity] : 0,
  easing: "linear",
  duration: 300
});

export const easing = "spring(1, 150, 10)";
