"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { useLanguage } from "@/hooks/use-language";
import { useProgress } from "@/hooks/use-progress";
import { readLocalMediaText } from "@/lib/local-media-storage";

type Props = {
  htmlUrl: string;
  lessonId: string;
  courseSlug: string;
  moduleSlug: string;
  lessonSlug: string;
};

const MESSAGE_SOURCE = "nutvita-interactive-html";

function sanitizeAndInstrument(
  source: string,
  locale: "fr" | "en",
  initialPercent: number,
) {
  const document = new DOMParser().parseFromString(source, "text/html");
  document
    .querySelectorAll("script,iframe,object,embed,form,base,meta,link")
    .forEach((element) => element.remove());
  document.querySelectorAll("*").forEach((element) => {
    for (const attribute of [...element.attributes]) {
      if (
        attribute.name.toLowerCase().startsWith("on") ||
        (attribute.name === "href" && /^\s*javascript:/i.test(attribute.value)) ||
        (attribute.name === "src" && /^\s*(javascript:|https?:)/i.test(attribute.value))
      )
        element.removeAttribute(attribute.name);
    }
  });

  let steps = [...document.querySelectorAll<HTMLElement>("[data-reveal-step]")];
  if (steps.length === 0) {
    const candidates = [...document.body.children].filter((element) =>
      ["SECTION", "ARTICLE"].includes(element.tagName),
    ) as HTMLElement[];
    if (candidates.length > 1) {
      candidates.forEach((element) => element.setAttribute("data-reveal-step", ""));
      steps = candidates;
    }
  }
  if (steps.length === 0) {
    const wrapper = document.createElement("section");
    wrapper.setAttribute("data-reveal-step", "");
    while (document.body.firstChild) wrapper.append(document.body.firstChild);
    document.body.append(wrapper);
    steps = [wrapper];
  }

  const labels =
    locale === "fr"
      ? {
          explore: "Explorez tous les éléments explicatifs pour continuer.",
          continue: "J’ai compris — continuer",
          complete: "Lecture interactive terminée",
          step: "Section",
        }
      : {
          explore: "Explore every explanatory item to continue.",
          continue: "I understand — continue",
          complete: "Interactive reading completed",
          step: "Section",
        };
  const initialCompleted = Math.min(
    steps.length,
    Math.floor((initialPercent / 100) * steps.length),
  );
  const payload = JSON.stringify({ labels, initialCompleted, source: MESSAGE_SOURCE });
  const style = document.createElement("style");
  style.textContent = `
    :root{font-family:Inter,Arial,sans-serif;color:#16352b;background:#fff}
    body{margin:0;padding:24px;line-height:1.7}
    [data-reveal-step]{border:1px solid #d9eee4;border-radius:18px;padding:22px;margin:0 0 18px;background:#fbfefc}
    [data-reveal-step][hidden]{display:none!important}
    [data-explanation]{cursor:pointer;border-radius:10px;transition:.2s}
    [data-explanation]:focus{outline:3px solid #f5b85c;outline-offset:3px}
    [data-explanation].nvg-explored{box-shadow:0 0 0 2px #16845b}
    .nvg-gate{margin-top:20px;padding-top:16px;border-top:1px dashed #b7d8c8}
    .nvg-hint{font-size:13px;color:#5c6f68}
    .nvg-next{border:0;border-radius:999px;background:#0b5d3b;color:white;padding:11px 18px;font-weight:800;cursor:pointer}
    .nvg-next:disabled{cursor:not-allowed;opacity:.42}
    .nvg-step{font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#b86616;font-weight:800}
  `;
  document.head.append(style);
  const policy = document.createElement("meta");
  policy.httpEquiv = "Content-Security-Policy";
  policy.content =
    "default-src 'none'; img-src data: blob:; media-src data: blob:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; font-src data:";
  document.head.prepend(policy);
  const script = document.createElement("script");
  script.textContent = `(${function (config: {
    labels: Record<string, string>;
    initialCompleted: number;
    source: string;
  }) {
    const steps = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal-step]"),
    );
    let completed = Math.min(config.initialCompleted, steps.length);
    const send = () =>
      parent.postMessage(
        {
          source: config.source,
          completedSteps: completed,
          totalSteps: steps.length,
          completed: completed === steps.length,
        },
        "*",
      );
    steps.forEach((step, index) => {
      step.hidden = index > completed;
      const marker = document.createElement("p");
      marker.className = "nvg-step";
      marker.textContent = `${config.labels.step} ${index + 1}/${steps.length}`;
      step.prepend(marker);
      const explanations = Array.from(
        step.querySelectorAll<HTMLElement>("[data-explanation]"),
      );
      explanations.forEach((element) => {
        element.tabIndex = 0;
        element.setAttribute("role", "button");
      });
      const gate = document.createElement("div");
      gate.className = "nvg-gate";
      const hint = document.createElement("p");
      hint.className = "nvg-hint";
      hint.textContent = config.labels.explore;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "nvg-next";
      button.textContent =
        index === steps.length - 1
          ? config.labels.complete
          : config.labels.continue;
      const explored = new Set<HTMLElement>();
      const refresh = () => {
        button.disabled = explored.size < explanations.length;
        hint.hidden = explanations.length === 0 || !button.disabled;
      };
      const explore = (element: HTMLElement) => {
        explored.add(element);
        element.classList.add("nvg-explored");
        refresh();
      };
      explanations.forEach((element) => {
        element.addEventListener("click", () => explore(element));
        element.addEventListener("keydown", (event) => {
          if (event.key === "Enter" || event.key === " ") explore(element);
        });
      });
      button.addEventListener("click", () => {
        completed = Math.max(completed, index + 1);
        const next = steps[index + 1];
        if (next) {
          next.hidden = false;
          next.scrollIntoView({ behavior: "smooth", block: "start" });
        }
        button.disabled = true;
        send();
      });
      gate.append(hint, button);
      step.append(gate);
      refresh();
    });
    for (let index = 0; index < completed; index += 1) {
      const next = steps[index + 1];
      if (next) next.hidden = false;
    }
    send();
  }.toString()})(${payload});`;
  document.body.append(script);
  return `<!doctype html>${document.documentElement.outerHTML}`;
}

export function InteractiveHtmlLesson(props: Props) {
  const { locale, text } = useLanguage();
  const { getLessonProgress, registerLessonVisit, updateLessonProgress } =
    useProgress();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [source, setSource] = useState("");
  const [error, setError] = useState("");
  const progress = getLessonProgress(
    props.courseSlug,
    props.moduleSlug,
    props.lessonSlug,
  );
  const [initialProgressPercent] = useState(progress?.progressPercent ?? 0);

  useEffect(() => {
    let active = true;
    setSource("");
    setError("");
    void readLocalMediaText(props.htmlUrl)
      .then((html) => {
        if (active)
          setSource(
            sanitizeAndInstrument(
              html,
              locale,
              initialProgressPercent,
            ),
          );
      })
      .catch(() => {
        if (active)
          setError(
            text(
              "Le document HTML interactif ne peut pas être chargé.",
              "The interactive HTML document could not be loaded.",
            ),
          );
      });
    return () => {
      active = false;
    };
  }, [initialProgressPercent, locale, props.htmlUrl, text]);

  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source !== frameRef.current?.contentWindow ||
        event.data?.source !== MESSAGE_SOURCE
      )
        return;
      const total = Number(event.data.totalSteps);
      const completed = Number(event.data.completedSteps);
      if (!Number.isFinite(total) || !Number.isFinite(completed) || total < 1)
        return;
      registerLessonVisit(props);
      updateLessonProgress({
        ...props,
        progressPercent: Math.round((completed / total) * 100),
      });
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [props, registerLessonVisit, updateLessonProgress]);

  const status = useMemo(
    () => progress?.status === "completed",
    [progress?.status],
  );

  if (error)
    return <div className="rounded-2xl bg-red-50 p-5 text-red-800">{error}</div>;
  if (!source)
    return (
      <div className="flex min-h-72 items-center justify-center gap-3 rounded-2xl bg-slate-50 font-bold text-slate-600">
        <LoaderCircle className="animate-spin" />
        {text("Préparation de la lecture…", "Preparing the reading…")}
      </div>
    );
  return (
    <div>
      <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
        {status ? <CheckCircle2 size={18} /> : <ShieldCheck size={18} />}
        {status
          ? text("Lecture validée.", "Reading validated.")
          : text(
              "Chaque section se déverrouille après exploration des explications.",
              "Each section unlocks after you explore its explanations.",
            )}
      </div>
      <iframe
        ref={frameRef}
        title={text("Lecture HTML interactive", "Interactive HTML reading")}
        srcDoc={source}
        sandbox="allow-scripts"
        className="min-h-[680px] w-full rounded-2xl border border-emerald-100 bg-white"
      />
    </div>
  );
}
