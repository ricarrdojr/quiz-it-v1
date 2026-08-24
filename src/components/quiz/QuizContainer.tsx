'use client';
import { useState, useCallback, useEffect } from 'react';
import type { QuizAnswers } from '@/types/quiz';
import { LOVE_LIFE_OPTIONS, PATTERN_OPTIONS, DESIRE_OPTIONS, IMPORTANCE_OPTIONS, PROGRESS_TARGETS } from '@/data/quizData';
import { goToCheckout } from '@/lib/checkout';
import { useAssetPrefetch } from '@/hooks/useAssetPrefetch';
import { trackFunnelEvent } from '@/lib/tracking';
import { readSession, writeSession } from '@/lib/session';

import { Step00Landing } from './steps/Step00Landing';
import { Step01Gender } from './steps/Step01Gender';
import { Step02Interest } from './steps/Step02Interest';
import { Step03Transition } from './steps/Step03Transition';
import { SingleSelect } from './steps/SingleSelect';
import { MultiSelect } from './steps/MultiSelect';
import { Step08Name } from './steps/Step08Name';
import { Step09Zodiac } from './steps/Step09Zodiac';
import { Step10BirthChart } from './steps/Step10BirthChart';
import { Step11Audio } from './steps/Step11Audio';
import { Step12Testimonials } from './steps/Step12Testimonials';
import { Step13Revelation } from './steps/Step13Revelation';
import { Step14Email } from './steps/Step14Email';
import { Step15Paywall } from './steps/Step15Paywall';
import { DevStepNav } from './DevStepNav';
import { VturbPreload } from './VturbPreload';

export function QuizContainer() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({ name: '' });
  const [patterns, setPatterns] = useState<string[]>([]);
  const [desires, setDesires] = useState<string[]>([]);
  const [importance, setImportance] = useState<string[]>([]);

  // Spends the question steps' idle bandwidth on the media the later steps will
  // ask for. See useAssetPrefetch for the measurements behind the schedule.
  useAssetPrefetch(step);

  /**
   * Restores a session left behind when the TikTok bottom sheet was dismissed.
   *
   * In an effect rather than a `useState` initializer, and that is not a style
   * choice: this page is statically prerendered, so the server render and the
   * first client render must agree. Reading `localStorage` while seeding state
   * would make them disagree and break hydration.
   *
   * The cost is one frame on step 0 before the jump. The alternative — holding
   * the first paint until the restore runs — would delay the landing page for
   * every first-time visitor to spare returning ones a flicker, and this funnel
   * is served over mobile data into an in-app WebView where first paint is the
   * expensive thing. One frame is the cheaper trade.
   */
  useEffect(() => {
    const saved = readSession();
    if (!saved) return;
    setStep(saved.step);
    setAnswers(saved.answers);
    setPatterns(saved.patterns);
    setDesires(saved.desires);
    setImportance(saved.importance);
  }, []);

  /**
   * Mirrors every state change into storage.
   *
   * Covers both cases the spec asks for at once: a step change, and an answer
   * recorded on a step the reader has not left yet. Step 0 with untouched
   * answers is skipped so that merely opening the funnel does not write a blob
   * that would later be restored into the same state it already had.
   */
  useEffect(() => {
    const untouched =
      step === 0 &&
      !answers.gender &&
      !answers.interest &&
      patterns.length === 0 &&
      desires.length === 0 &&
      importance.length === 0;
    if (untouched) return;

    writeSession({ step, answers, patterns, desires, importance });
  }, [step, answers, patterns, desires, importance]);

  /**
   * The two funnel-step postbacks, both driven from `step` rather than from the
   * button that caused it, so neither can end up half-wired — every route into a
   * step passes through here, the dev navigator included.
   *
   * Starquiz: leaving the landing page, the moment the reader commits.
   * Endquiz: arriving at step 11, the first screen past the last question the
   * quiz asks (zodiac on step 9, then the birth chart reveal on step 10).
   *
   * `trackFunnelEvent` de-duplicates per page life, so the `>=` comparisons fire
   * once each however many times the reader moves forward from here.
   */
  useEffect(() => {
    if (step >= 1) trackFunnelEvent('Starquiz');
    if (step >= 11) trackFunnelEvent('Endquiz');
  }, [step]);

  const next = useCallback(() => setStep(s => s + 1), []);
  const back = useCallback(() => setStep(s => Math.max(0, s - 1)), []);
  /** The original's bar is hand-tuned per step, not step/total — see PROGRESS_TARGETS. */
  const pct = (step: number) => PROGRESS_TARGETS[step] ?? 0;

  const saveResults = async (data: QuizAnswers) => {
    try { await fetch('/api/quiz', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); }
    catch { /* ponytail: fire-and-forget, no blocking on network errors */ }
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return <Step00Landing onStart={next} />;

      case 1:
        return (
          <Step01Gender
            onSelect={g => { setAnswers(a => ({ ...a, gender: g })); next(); }}
            onBack={back}
            progressPct={pct(1)}
          />
        );

      case 2:
        return (
          <Step02Interest
            onSelect={i => { setAnswers(a => ({ ...a, interest: i })); next(); }}
            onBack={back}
            progressPct={pct(2)}
          />
        );

      case 3:
        return <Step03Transition interest={answers.interest} onContinue={next} />;

      case 4:
        return (
          <SingleSelect
            title="Cosa descrive meglio la tua vita sentimentale in questo momento?"
            options={LOVE_LIFE_OPTIONS}
            onSelect={v => { setAnswers(a => ({ ...a, loveLife: v })); next(); }}
            progressPct={pct(4)}
          />
        );

      case 5:
        return (
          <MultiSelect
            title="Ti riconosci in qualcuno di questi schemi?"
            subtitle="Seleziona tutte le opzioni che senti tue"
            options={PATTERN_OPTIONS}
            values={patterns}
            onChange={setPatterns}
            onNext={() => { setAnswers(a => ({ ...a, patterns })); next(); }}
            progressPct={pct(5)}
          />
        );

      case 6:
        return (
          <MultiSelect
            title="Cosa desideri di più dalla tua anima gemella?"
            subtitle="Seleziona tutte le opzioni che senti tue"
            options={DESIRE_OPTIONS}
            values={desires}
            onChange={setDesires}
            onNext={() => { setAnswers(a => ({ ...a, desires })); next(); }}
            progressPct={pct(6)}
          />
        );

      case 7:
        return (
          <MultiSelect
            title="Cosa conta di più per te in un partner?"
            subtitle="Seleziona tutte le opzioni che senti tue"
            options={IMPORTANCE_OPTIONS}
            values={importance}
            onChange={setImportance}
            onNext={() => { setAnswers(a => ({ ...a, importance })); next(); }}
            progressPct={pct(7)}
          />
        );

      case 8:
        return (
          <Step08Name
            onSubmit={n => { setAnswers(a => ({ ...a, name: n })); next(); }}
            progressPct={pct(8)}
          />
        );

      case 9:
        return (
          <Step09Zodiac
            onSelect={z => { setAnswers(a => ({ ...a, zodiac: z })); next(); }}
            progressPct={pct(9)}
          />
        );

      case 10:
        return (
          <Step10BirthChart
            zodiac={answers.zodiac || 'Vergine'}
            onContinue={next}
            progressPct={pct(10)}
          />
        );

      case 11:
        return <Step11Audio onContinue={next} progressPct={pct(11)} />;

      case 12:
        return <Step12Testimonials onContinue={next} progressPct={pct(12)} />;

      case 13:
        return (
          <Step13Revelation
            name={answers.name}
            zodiac={answers.zodiac || 'Ariete'}
            onContinue={next}
            progressPct={pct(13)}
          />
        );

      case 14:
        return (
          <Step14Email
            name={answers.name}
            onSubmit={e => {
              const final = { ...answers, email: e, patterns, desires, importance };
              setAnswers(final);
              saveResults(final);
              next();
            }}
            progressPct={pct(14)}
          />
        );

      case 15:
        return (
          <Step15Paywall
            name={answers.name}
            zodiac={answers.zodiac || 'Ariete'}
            interest={answers.interest}
            // The handoff is assembled here rather than inside the paywall so
            // the step stays a presentational unit that only reports intent —
            // `answers` is already the single source of truth for the name from
            // step 8 and the email from step 14, and threading either of them
            // down as another prop would just duplicate it.
            onCheckout={() => goToCheckout({ name: answers.name, email: answers.email })}
          />
        );

      default:
        return <Step00Landing onStart={() => setStep(0)} />;
    }
  };

  /** Two steps of head start for the step-15 player. See VturbPreload. */
  const PRELOAD_PLAYER_FROM = 13;

  return (
    <>
      {step >= PRELOAD_PLAYER_FROM && <VturbPreload />}
      {renderStep()}
      {/* Dev-only page jumper — stripped from production builds. See DevStepNav. */}
      {process.env.NODE_ENV === 'development' && (
        <DevStepNav step={step} onStep={setStep} />
      )}
    </>
  );
}
