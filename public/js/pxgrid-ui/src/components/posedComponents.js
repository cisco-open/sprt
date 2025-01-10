import posed from "react-pose";

const fade = {
  enter: { opacity: 1 },
  exit: { opacity: 0 },
};

export const FadeDiv = posed.div(fade);

FadeDiv.defaultProps = {
  pose: "enter",
  initialPose: "exit",
};

export const PosedDiv = posed.div({
  enter: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: 50 },
});

export const PosedA = posed.a({
  enter: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0 } },
});

export const PosedH2 = posed.h2({
  enter: { opacity: 1 },
  exit: { opacity: 0 },
});

export const Container = posed.div({
  enter: { staggerChildren: 50 },
  exit: {},
});

export const StaggedUL = posed.ul({
  enter: { staggerChildren: 50 },
  exit: {},
});
