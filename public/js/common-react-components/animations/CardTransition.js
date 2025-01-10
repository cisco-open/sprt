import React from "react";
import anime from "animejs";
import Transition from "react-transition-group/Transition";

import {
  createOpacityAnimationConfig,
  ANIMATION_DONE_EVENT,
  easing,
  triggerAnimationDoneEvent
} from "./animeUtils";

const animateGridIn = gridContainer =>
  anime
    .timeline()
    .add({
      targets: gridContainer,
      opacity: createOpacityAnimationConfig(true),
      easing
    })
    .add(
      {
        targets: gridContainer.querySelectorAll(".card"),
        easing,
        opacity: createOpacityAnimationConfig(true),
        translateX: [-30, 0],
        delay: anime.stagger(70)
      },
      "-=500"
    );

const animateGridOut = gridContainer =>
  anime
    .timeline()
    .add({
      targets: gridContainer.querySelectorAll(".card"),
      easing,
      opacity: createOpacityAnimationConfig(false),
      translateY: -30,
      delay: anime.stagger(50)
    })
    .add(
      {
        targets: gridContainer,
        opacity: createOpacityAnimationConfig(false),
        easing,
        complete: () => triggerAnimationDoneEvent(gridContainer)
      },
      "-=1400"
    );

const animateCardIn = card =>
  anime({
    targets: card,
    opacity: createOpacityAnimationConfig(true),
    translateY: [50, 0],
    easing
  });

const animateCardOut = card =>
  anime({
    targets: card,
    translateY: -10,
    opacity: createOpacityAnimationConfig(false),
    easing
  });

const addEndListener = (node, done) =>
  node.addEventListener(ANIMATION_DONE_EVENT, done);

export const CardTransaction = props => (
  <Transition
    onEnter={animateCardIn}
    onExit={animateCardOut}
    addEndListener={addEndListener}
    {...props}
  />
);

export const CardGridTransaction = props => {
  const transitionKey = React.useRef(1);
  const [prevVisible, setPrevVisible] = React.useState(visible);
  if (visible !== prevVisible) setPrevVisible(visible);
  if (visible && !prevVisible) {
    transitionKey.current += 1;
  }

  return (
    <Transition
      unmountOnExit
      appear
      addEndListener={addEndListener}
      onEnter={animateGridIn}
      onExit={animateGridOut}
      in={visible}
      key={transitionKey.current}
      {...props}
    />
  );
};
