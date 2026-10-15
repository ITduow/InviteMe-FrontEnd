"use client";

import { useEffect, useRef, useState } from "react";
import { WidgetBox } from "./date-widgets";
import type { ItemProps } from "./items";

export const defaultQuestions = [
  {
    question: "Điều gì khiến hai bạn muốn cùng nhau đi tiếp?",
    answer:
      "Là cảm giác bình yên khi có một người luôn lắng nghe. Những điều giản dị đã trở thành lý do để chúng mình chọn nhau mỗi ngày.",
  },
  {
    question: "Hai bạn mong chờ điều gì nhất?",
    answer:
      "Một mái nhà nhiều tiếng cười, những chuyến đi mới và thời gian dành cho gia đình, bạn bè.",
  },
];
export const defaultMilestones = [
  { time: "17:30", title: "Đón khách", description: "Chụp ảnh và cùng lưu lại kỷ niệm." },
  {
    time: "18:00",
    title: "Lễ thành hôn",
    description: "Cùng chứng kiến lời hẹn ước của chúng mình.",
  },
  { time: "18:30", title: "Tiệc thân mật", description: "Nâng ly và chia sẻ niềm vui." },
];

export function StudioInterview(props: ItemProps) {
  const questions = props.questions?.length ? props.questions : defaultQuestions;
  const [active, setActive] = useState(0);
  const index = Math.min(active, questions.length - 1);
  const current = questions[index];
  return (
    <WidgetBox {...props} baseHeight={400}>
      <p style={{ fontSize: 12, letterSpacing: 3, margin: "4px 0" }}>A LITTLE CONVERSATION</p>
      <h2 style={{ fontSize: 34, fontWeight: 400, margin: "8px 0 14px" }}>
        {props.title ?? "Interview"}
      </h2>
      <div
        style={{ textAlign: "left", overflowY: "auto", flex: 1, padding: "6px 12px" }}
        aria-live="polite"
      >
        <h3 style={{ fontSize: 23, fontWeight: 400, margin: "0 0 16px", overflowWrap: "anywhere" }}>
          {current?.question || "Câu hỏi của chúng mình"}
        </h3>
        <p
          style={{
            fontSize: 18,
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            margin: 0,
            overflowWrap: "anywhere",
          }}
        >
          {current?.answer}
        </p>
      </div>
      <nav
        aria-label="Câu hỏi phỏng vấn"
        style={{ display: "flex", justifyContent: "center", gap: 8, paddingTop: 12 }}
      >
        {questions.map((_, i) => (
          <button
            key={i}
            aria-label={`Câu hỏi ${i + 1}`}
            aria-current={index === i ? "true" : undefined}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={() => setActive(i)}
            style={{
              border: `1px solid ${props.accent ?? "#7b6150"}`,
              borderRadius: "50%",
              width: 30,
              height: 30,
              padding: 0,
              background: index === i ? (props.accent ?? "#7b6150") : "transparent",
              color: index === i ? "#ffffff" : "inherit",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            {i + 1}
          </button>
        ))}
      </nav>
    </WidgetBox>
  );
}
StudioInterview.craft = {
  displayName: "Interview",
  props: {
    x: 40,
    y: 200,
    width: 400,
    height: 430,
    title: "Interview",
    questions: defaultQuestions,
    background: "#f8f3eb",
    color: "#493b32",
    accent: "#7b6150",
    fontFamily: "EB Garamond",
  },
};

export function StudioTimeline(props: ItemProps) {
  const steps = props.milestones?.length ? props.milestones : defaultMilestones;
  const content = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(500);
  useEffect(() => {
    const element = content.current;
    if (!element) return;
    const measure = () => setContentHeight(element.scrollHeight + 28);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    measure();
    return () => observer.disconnect();
  }, []);
  const rowHeights = steps.map((step) =>
    Math.max(
      130,
      45 + Math.ceil(step.title.length / 23) * 30 + Math.ceil(step.description.length / 34) * 23,
    ),
  );
  return (
    <WidgetBox {...props} baseHeight={contentHeight}>
      <div ref={content} style={{ display: "flow-root", flexShrink: 0, overflowWrap: "anywhere" }}>
        <h2 style={{ fontSize: 32, fontWeight: 400, margin: "4px 0 16px" }}>
          {props.title ?? "Timeline"}
        </h2>
        <ol style={{ listStyle: "none", margin: 0, padding: "0 12px", textAlign: "left" }}>
          {steps.map((step, index) => (
            <li
              key={index}
              style={{
                position: "relative",
                borderLeft: `1px solid ${props.accent ?? "#687950"}`,
                padding: "0 0 15px 24px",
                minHeight: rowHeights[index],
                boxSizing: "border-box",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  left: -5,
                  top: 8,
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: props.accent ?? "#687950",
                }}
              />
              <span style={{ fontSize: 14, letterSpacing: 1 }}>{step.time}</span>
              <h3
                style={{ fontWeight: 400, fontSize: 24, margin: "5px 0", overflowWrap: "anywhere" }}
              >
                {step.title || "Mốc hẹn của chúng mình"}
              </h3>
              <p
                style={{
                  fontSize: 16,
                  lineHeight: 1.4,
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  overflowWrap: "anywhere",
                }}
              >
                {step.description}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </WidgetBox>
  );
}
StudioTimeline.craft = {
  displayName: "Timeline",
  props: {
    x: 40,
    y: 200,
    width: 400,
    height: 480,
    title: "Timeline",
    milestones: defaultMilestones,
    background: "#f8f3eb",
    color: "#493b32",
    accent: "#687950",
    fontFamily: "EB Garamond",
  },
};
