'use client';

import type { Gender, Quiz } from '@boosta/contracts';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/button';
import { cx } from '@/lib/cx';

import { loadQuizProgress, saveQuizProgress } from '../quiz-storage';
import styles from './start-screen.module.css';

/** The first screen: the visitor picks Male or Female, which starts the quiz. */
export function StartScreen({ quiz }: { quiz: Quiz }) {
  const router = useRouter();

  const start = (gender: Gender) => {
    const saved = loadQuizProgress();
    // Answers given before returning to this screen are kept, as long as they
    // belong to the quiz version that is being served now.
    const resumable = saved?.quizVersionId === quiz.versionId ? saved : null;
    saveQuizProgress({
      quizVersionId: quiz.versionId,
      gender,
      answers: resumable?.answers ?? {},
      index: resumable?.index ?? 0,
    });
    router.push('/quiz');
  };

  return (
    <section className={styles.card}>
      <div className={styles.illustration} aria-hidden="true">
        <Image
          className={styles.head}
          src="/images/hero-head.png"
          alt=""
          width={273}
          height={237}
          sizes="(min-width: 48rem) 273px, 169px"
          loading="eager"
          fetchPriority="high"
        />
        <p className={cx(styles.label, styles.labelProductivity)}>
          <span className={styles.accent}>High</span> Productivity
        </p>
        <p className={cx(styles.label, styles.labelRow, styles.labelImpulsivity)}>
          <Image src="/images/trend-up.svg" alt="" width={24} height={24} unoptimized />
          <span className={styles.accent}>+10%</span> Impulsivity
        </p>
        <p className={cx(styles.label, styles.labelRow, styles.labelFocus)}>
          <Image src="/images/trend-down.svg" alt="" width={24} height={24} unoptimized />
          <span className={styles.accent}>-6%</span> Focus
        </p>
        <p className={cx(styles.label, styles.labelDistractions)}>
          <span className={styles.accent}>Medium</span> Distractions
        </p>
      </div>

      <div className={styles.text}>
        <h1 className={styles.title}>
          Discover Your <span className={styles.titleAccent}>ADHD Trait Profile</span>
        </h1>
        <p className={styles.subtitle}>
          Find out how ADHD traits influence your focus, energy, and daily life
        </p>
      </div>

      <div className={styles.choices} role="group" aria-labelledby="gender-prompt">
        <p id="gender-prompt" className="visually-hidden">
          Select your gender to start the test
        </p>
        <Button
          onClick={() => {
            start('male');
          }}
        >
          Male
        </Button>
        <Button
          onClick={() => {
            start('female');
          }}
        >
          Female
        </Button>
      </div>
    </section>
  );
}
