import React from "react";
import anime from "animejs";
import Transition from "react-transition-group/Transition";

import {
  createOpacityAnimationConfig,
  triggerAnimationDoneEvent,
  ANIMATION_DONE_EVENT,
  easing
} from "./animeUtils";

const animateFadeIn = element =>
  anime({
    targets: element,
    opacity: createOpacityAnimationConfig(true),
    translateY: [50, 0],
    complete: () => {
      element.style.transform = null;
      triggerAnimationDoneEvent(element);
    },
    easing
  });

const animateFadeOut = element =>
  anime({
    targets: element,
    translateY: -10,
    height: {
      delay: 300,
      value: 0
    },
    marginTop: 0,
    marginBottom: 0,
    opacity: createOpacityAnimationConfig(false),
    begin: () => {
      element.style.minHeight = 0;
    },
    complete: () => {
      element.style.minHeight = null;
      triggerAnimationDoneEvent(element);
    },
    easing
  });

const addEndListener = (node, done) =>
  node.addEventListener(ANIMATION_DONE_EVENT, done);

export default props => (
  <Transition
    timeout={{
      enter: 300,
      appear: 300,
      exit: 600
    }}
    onEnter={animateFadeIn}
    onExit={animateFadeOut}
    addEndListener={addEndListener}
    {...props}
  />
);
