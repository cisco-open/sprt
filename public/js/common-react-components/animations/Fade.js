import React from "react";
import CSSTransition from "react-transition-group/CSSTransition";
import anime from "animejs";
import Transition from "react-transition-group/Transition";

import {
  createOpacityAnimationConfig,
  triggerAnimationDoneEvent,
  ANIMATION_DONE_EVENT,
  easing,
} from "./animeUtils";

const animateFadeIn = (element, targetOpacity) =>
  anime({
    targets: element,
    opacity: createOpacityAnimationConfig(true, targetOpacity),
    complete: () => {
      triggerAnimationDoneEvent(element);
    },
    easing,
  });

const animateFadeOut = (element) =>
  anime({
    targets: element,
    opacity: createOpacityAnimationConfig(false),
    complete: () => {
      triggerAnimationDoneEvent(element);
    },
    easing,
  });

const addEndListener = (node, done) =>
  node.addEventListener(ANIMATION_DONE_EVENT, done);

export default ({ endOpacity, ...props }) => (
  <Transition
    timeout={300}
    onEnter={(e) => animateFadeIn(e, endOpacity || 1)}
    onExit={animateFadeOut}
    addEndListener={addEndListener}
    {...props}
  />
);

export const TabFade = (props) => (
  <CSSTransition
    timeout={300}
    classNames={{
      appear: "show",
      appearActive: "show animated fastest fadeIn",
      appearDone: "show",
      enter: "show",
      enterActive: "show animated fastest fadeIn",
      enterDone: "show",
      exit: "show",
      exitActive: "show animated fastest fadeOut",
      exitDone: "",
    }}
    appear
    enter
    exit
    {...props}
  />
);

export const CSSFade = (props) => (
  <CSSTransition
    mountOnEnter
    unmountOnExit
    appear
    classNames={{
      appear: "animated fadeIn fastest",
      appearActive: "animated fadeIn fastest",
      appearDone: "animated",
      enter: "animated fadeIn fastest",
      enterActive: "animated fadeIn fastest",
      enterDone: "animated",
      exit: "fanimated fadeOut fastest",
      exitActive: "animated fadeOut fastest",
      exitDone: "hide",
    }}
    timeout={300}
    {...props}
  />
);
