"use client";

import Image from "next/image";
import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";
import styles from "./browser-tools-workspace.module.css";

type Lang = "en" | "ar";

interface SpeechAlternativeLike {
  transcript: string;
}

interface SpeechResultLike {
  readonly [index: number]: SpeechAlternativeLike | undefined;
  readonly isFinal: boolean;
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechResultLike>;
}

interface SpeechRecognizerLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type SpeechRecognizerConstructor = new () => SpeechRecognizerLike;

type VisionDetails = {
  name: string;
  mimeType: string;
  sizeLabel: string;
  width: number;
  height: number;
  orientation: string;
  averageColor: string;
  brightness: number;
};

function recognitionConstructor(): SpeechRecognizerConstructor | undefined {
  if (typeof window === "undefined") return undefined;
  const speechWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognizerConstructor;
    webkitSpeechRecognition?: SpeechRecognizerConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
}

export function VoiceWorkspace({ lang }: { lang: Lang }) {
  const recognizer = useRef<SpeechRecognizerLike | undefined>(undefined);
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    setSupported(Boolean(recognitionConstructor()));
    return () => recognizer.current?.abort();
  }, []);

  function start() {
    const Constructor = recognitionConstructor();
    if (!Constructor) {
      setMessage(lang === "ar" ? "المتصفح لا يدعم الإدخال الصوتي." : "This browser does not support voice input.");
      return;
    }
    recognizer.current?.abort();
    const instance = new Constructor();
    instance.lang = lang === "ar" ? "ar-SA" : "en-US";
    instance.continuous = true;
    instance.interimResults = true;
    instance.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript ?? "";
        if (result?.isFinal) finalText += `${text} `;
        else interimText += text;
      }
      if (finalText) setTranscript((current) => `${current}${finalText}`.trimStart());
      setInterim(interimText);
    };
    instance.onerror = (event) => {
      setMessage(lang === "ar" ? `تعذر التعرف على الصوت: ${event.error}` : `Voice recognition failed: ${event.error}`);
      setListening(false);
    };
    instance.onend = () => setListening(false);
    recognizer.current = instance;
    setMessage(undefined);
    setListening(true);
    instance.start();
  }

  function stop() {
    recognizer.current?.stop();
    setListening(false);
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${transcript}${interim}`.trim());
      setMessage(lang === "ar" ? "تم نسخ النص." : "Transcript copied.");
    } catch {
      setMessage(lang === "ar" ? "تعذر نسخ النص تلقائيًا." : "Could not copy the transcript automatically.");
    }
  }

  return (
    <div className={styles.workspace}>
      <div className={`${styles.voiceOrb} ${listening ? styles.voiceOrbActive : ""}`} aria-hidden="true">
        <span />
      </div>
      <h2>{lang === "ar" ? "الإدخال الصوتي المباشر" : "Live voice input"}</h2>
      <p>{supported
        ? (lang === "ar" ? "ابدأ التسجيل وسيُحوّل المتصفح كلامك إلى نص مباشرة." : "Start listening and the browser will transcribe your speech live.")
        : (lang === "ar" ? "استخدم Chrome أو Edge لتفعيل الإدخال الصوتي." : "Use Chrome or Edge to enable voice input.")}</p>
      <textarea
        className={styles.transcript}
        aria-label={lang === "ar" ? "النص المفرغ" : "Transcript"}
        value={`${transcript}${interim ? ` ${interim}` : ""}`}
        onChange={(event) => { setTranscript(event.target.value); setInterim(""); }}
        placeholder={lang === "ar" ? "سيظهر النص هنا…" : "Your transcript will appear here…"}
      />
      <div className={styles.actions}>
        <button type="button" onClick={listening ? stop : start} disabled={!supported}>
          {listening ? (lang === "ar" ? "إيقاف" : "Stop") : (lang === "ar" ? "بدء الاستماع" : "Start listening")}
        </button>
        <button type="button" onClick={() => { setTranscript(""); setInterim(""); }}>
          {lang === "ar" ? "مسح" : "Clear"}
        </button>
        <button type="button" onClick={() => void copy()} disabled={!transcript && !interim}>
          {lang === "ar" ? "نسخ" : "Copy"}
        </button>
      </div>
      {message && <p className={styles.message} aria-live="polite">{message}</p>}
    </div>
  );
}

async function inspectImage(file: File, dataUrl: string): Promise<VisionDetails> {
  const image = new window.Image();
  image.src = dataUrl;
  await image.decode();
  const sampleWidth = Math.max(1, Math.min(64, image.naturalWidth));
  const sampleHeight = Math.max(1, Math.min(64, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("CANVAS_UNAVAILABLE");
  context.drawImage(image, 0, 0, sampleWidth, sampleHeight);
  const pixels = context.getImageData(0, 0, sampleWidth, sampleHeight).data;
  let red = 0;
  let green = 0;
  let blue = 0;
  let samples = 0;
  for (let index = 0; index < pixels.length; index += 4) {
    const alpha = pixels[index + 3] ?? 0;
    if (alpha < 16) continue;
    red += pixels[index] ?? 0;
    green += pixels[index + 1] ?? 0;
    blue += pixels[index + 2] ?? 0;
    samples += 1;
  }
  const divisor = Math.max(samples, 1);
  const averageRed = Math.round(red / divisor);
  const averageGreen = Math.round(green / divisor);
  const averageBlue = Math.round(blue / divisor);
  const averageColor = `#${[averageRed, averageGreen, averageBlue].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
  const brightness = Math.round((averageRed * 299 + averageGreen * 587 + averageBlue * 114) / 1000);
  const orientation = image.naturalWidth === image.naturalHeight ? "square" : image.naturalWidth > image.naturalHeight ? "landscape" : "portrait";
  return {
    name: file.name,
    mimeType: file.type || "image/unknown",
    sizeLabel: file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    width: image.naturalWidth,
    height: image.naturalHeight,
    orientation,
    averageColor,
    brightness,
  };
}

export function VisionWorkspace({ lang }: { lang: Lang }) {
  const [preview, setPreview] = useState<string>();
  const [details, setDetails] = useState<VisionDetails>();
  const [message, setMessage] = useState<string>();
  const [busy, setBusy] = useState(false);

  async function selectImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setMessage(lang === "ar" ? "اختر ملف صورة صالحًا." : "Choose a valid image file.");
      return;
    }
    setBusy(true);
    setMessage(undefined);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("READ_FAILED"));
        reader.onerror = () => reject(reader.error ?? new Error("READ_FAILED"));
        reader.readAsDataURL(file);
      });
      const inspected = await inspectImage(file, dataUrl);
      setPreview(dataUrl);
      setDetails(inspected);
    } catch {
      setMessage(lang === "ar" ? "تعذر تحليل الصورة في المتصفح." : "The browser could not inspect this image.");
    } finally {
      setBusy(false);
      event.target.value = "";
    }
  }

  return (
    <div className={`${styles.workspace} ${styles.visionWorkspace}`}>
      <h2>{lang === "ar" ? "فحص الصور المحلي" : "Local image inspection"}</h2>
      <p>{lang === "ar" ? "اختر صورة لقراءة خصائصها الفعلية داخل جهازك دون رفعها إلى خادم." : "Choose an image to inspect its real properties locally without uploading it to a server."}</p>
      <label className={styles.picker}>
        <input type="file" accept="image/*" onChange={(event) => void selectImage(event)} />
        <span>{busy ? (lang === "ar" ? "جارٍ التحليل…" : "Inspecting…") : (lang === "ar" ? "اختيار صورة" : "Choose image")}</span>
      </label>
      {preview && details && (
        <Image
          className={styles.preview}
          src={preview}
          alt={details.name}
          width={details.width}
          height={details.height}
          unoptimized
        />
      )}
      {details && (
        <div className={styles.details}>
          <article><small>{lang === "ar" ? "الملف" : "File"}</small><strong>{details.name}</strong><span>{details.mimeType} · {details.sizeLabel}</span></article>
          <article><small>{lang === "ar" ? "الأبعاد" : "Dimensions"}</small><strong>{details.width} × {details.height}</strong><span>{details.orientation}</span></article>
          <article><small>{lang === "ar" ? "اللون المتوسط" : "Average color"}</small><strong>{details.averageColor}</strong><i style={{ backgroundColor: details.averageColor }} /></article>
          <article><small>{lang === "ar" ? "السطوع" : "Brightness"}</small><strong>{details.brightness}/255</strong><span>{details.brightness >= 170 ? (lang === "ar" ? "فاتحة" : "Bright") : details.brightness <= 85 ? (lang === "ar" ? "داكنة" : "Dark") : (lang === "ar" ? "متوسطة" : "Balanced")}</span></article>
        </div>
      )}
      {message && <p className={styles.message} aria-live="polite">{message}</p>}
    </div>
  );
}
