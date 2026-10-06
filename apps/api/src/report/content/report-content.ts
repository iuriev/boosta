import type { Gender, TraitLevel } from '@boosta/contracts';

/**
 * Report copy, taken from the Figma design ("Test for dev", report frames for
 * Low and High traits, Male and Female). Text is kept exactly as designed.
 *
 * The one exception is marked below: the design shows an answer only for the
 * first FAQ question of each level, so the remaining answers were written for
 * this implementation.
 */

type ByLevelAndGender<T> = Record<TraitLevel, Record<Gender, T>>;

export const LEVEL_LABELS: Record<TraitLevel, string> = {
  high: 'High ADHD Traits',
  low: 'Low ADHD Traits',
};

export const SECTION_TITLES = {
  understanding: 'Understanding Your Score',
  strengths: 'Your Cognitive and Behavioral Strengths',
  emotional: 'Your Emotional Regulation and Impulse Control',
  faq: 'Frequently asked questions',
} as const;

export const UNDERSTANDING_TEXT: ByLevelAndGender<string> = {
  high: {
    male: 'Your score suggests that you exhibit high ADHD traits, meaning that difficulties with attention, impulse control, restlessness, and executive functioning may significantly affect daily life. In men, ADHD traits may be more noticeable through difficulties with impulsivity, maintaining focus, managing restlessness, or staying consistent with everyday tasks. At the same time, many men develop effective coping strategies that help them manage these challenges while drawing on their energy, creativity, and adaptability.',
    female:
      'Your score suggests that you exhibit high ADHD traits, meaning that difficulties with attention, organization, emotional regulation, and managing competing demands may significantly affect daily life. In women, ADHD can sometimes be less outwardly noticeable and may involve difficulties with staying organized, managing mental load, maintaining focus, or keeping up with multiple responsibilities. At the same time, many women develop strong coping strategies that help them compensate for these challenges while drawing on their creativity, adaptability, and resilience.',
  },
  low: {
    male: 'Your score suggests minimal ADHD traits. You show a strong ability to focus, stay organized, and manage daily responsibilities. In men, ADHD traits may more often appear through difficulties with attention, impulsivity, or restlessness. Your results suggest these challenges are unlikely to significantly affect your daily functioning.',
    female:
      'Your score suggests minimal ADHD traits. You show a strong ability to focus, stay organized, and manage daily responsibilities. For women, ADHD traits can sometimes appear more subtly through difficulties with attention, mental organization, or managing multiple demands. Your results suggest these challenges are unlikely to significantly affect your daily functioning.',
  },
};

export interface StrengthsContent {
  intro?: string;
  items: string[];
}

export const STRENGTHS: ByLevelAndGender<StrengthsContent> = {
  high: {
    male: {
      intro: 'Despite these challenges, you possess real strengths:',
      items: [
        'Strong creative problem-solving and ability to adapt quickly',
        'Ability to think outside the box and find unconventional solutions',
        'High energy and enthusiasm when engaged in areas of interest',
        'Resilience and persistence when facing setbacks',
        'Ability to hyperfocus on activities that capture your interest',
      ],
    },
    female: {
      intro: 'Despite these challenges, you possess real strengths:',
      items: [
        'Strong creative problem-solving and ability to adapt to changing situations',
        'Ability to see connections and possibilities others may overlook',
        'High enthusiasm and energy when engaged in meaningful activities',
        'Resilience and determination when facing setbacks',
        'Ability to hyperfocus on areas of strong interest when properly channeled',
      ],
    },
  },
  low: {
    male: {
      items: [
        'Strong ability to sustain attention and complete tasks',
        'Good impulse control and measured decision-making',
        'Consistent and reliable in personal and professional responsibilities',
        'Effective time management and organizational skills',
      ],
    },
    female: {
      items: [
        'Strong ability to sustain attention and complete tasks',
        'Effective organization and management of daily responsibilities',
        'Consistent and reliable in personal and professional settings',
        'Good self-regulation and thoughtful decision-making',
      ],
    },
  },
};

/** The Low reports have a single paragraph: no list and no closing paragraph. */
export interface EmotionalRegulationContent {
  intro: string;
  items: string[];
  outro?: string;
}

export const EMOTIONAL_REGULATION: ByLevelAndGender<EmotionalRegulationContent> = {
  high: {
    male: {
      intro:
        'Your high ADHD traits may influence your emotional responses and impulse control. Men with ADHD may sometimes experience greater difficulty with impulsivity, restlessness, or managing frustration. You may:',
      items: [
        'React quickly or impulsively when emotions run high',
        'Struggle with frustration and impatience in stressful situations',
        'Feel restless or find it difficult to stay engaged with tasks that feel repetitive',
        'Find it challenging to pause before interrupting conversations or making decisions',
      ],
      outro:
        'While impulse control can be challenging, developing self-awareness, structured routines, and practical coping strategies can help improve emotional regulation and everyday decision-making.',
    },
    female: {
      intro:
        'Your high ADHD traits may influence how you experience and manage emotions. Women with ADHD may sometimes experience stronger emotional responses, mental overwhelm, or difficulty balancing multiple demands. You may:',
      items: [
        'Experience intense emotions or become emotionally overwhelmed more easily',
        'Struggle with frustration when responsibilities or plans become difficult to manage',
        'Feel particularly affected by unexpected changes or setbacks',
        'Find it challenging to shift attention away from thoughts, tasks, or situations that feel emotionally significant',
      ],
      outro:
        'While emotional regulation can be challenging, developing self-awareness, supportive routines, and practical coping strategies can help create greater emotional stability.',
    },
  },
  low: {
    male: {
      intro:
        'Your low ADHD trait score suggests strong emotional regulation and impulse control in most situations. Men may sometimes experience ADHD-related challenges through impulsivity, restlessness, or difficulty managing frustration. Your results indicate that you generally maintain control and manage unexpected situations effectively.',
      items: [],
    },
    female: {
      intro:
        'Your low ADHD trait score suggests strong emotional regulation in most situations. Women may sometimes experience ADHD-related challenges through emotional overwhelm or difficulty managing competing demands. Your results indicate that you generally handle stress, frustration, and unexpected changes effectively.',
      items: [],
    },
  },
};

export interface FaqItem {
  question: string;
  answer: string;
}

/** The same for both genders. */
export const FAQ: Record<TraitLevel, FaqItem[]> = {
  high: [
    {
      question: 'Does a high ADHD score mean I have ADHD?',
      answer:
        'This score suggests significant ADHD traits, but an official diagnosis requires professional evaluation.',
    },
    {
      question: 'Can ADHD traits be strengths?',
      // Written for this implementation; the design has no answer for this question.
      answer:
        'Yes. Many people with these traits are creative, energetic, and able to focus deeply on what interests them.',
    },
    {
      question: 'What strategies can help manage high ADHD traits?',
      // Written for this implementation; the design has no answer for this question.
      answer:
        'Structured routines, breaking tasks into smaller steps, reminders, and regular physical activity are common starting points. A specialist can help you find what works for you.',
    },
    {
      question: 'Does this score mean I struggle with emotional regulation?',
      // Written for this implementation; the design has no answer for this question.
      answer:
        'Not necessarily. High ADHD traits often come with stronger emotional reactions, but how much this affects you is individual.',
    },
    {
      question: 'How can I stay organized with high ADHD traits?',
      // Written for this implementation; the design has no answer for this question.
      answer:
        'Keep important items in fixed places, write tasks down as soon as they come up, and use calendars or alarms for appointments and deadlines.',
    },
    {
      question: 'Can my ADHD trait levels change over time?',
      // Written for this implementation; the design has no answer for this question.
      answer:
        'Yes. Stress, sleep, health, and life circumstances can all affect attention and self-regulation, so your result may differ if you take the test again later.',
    },
  ],
  low: [
    {
      question: "Does a low ADHD score mean I definitely don't have ADHD?",
      answer:
        'A low score suggests minimal ADHD traits, but if you have concerns, a professional evaluation can provide a definitive answer.',
    },
    {
      question: 'Can I still benefit from brain training with low ADHD traits?',
      // Written for this implementation; the design has no answer for this question.
      answer:
        'Yes. Activities that challenge attention, memory, and planning can help keep these skills sharp, whatever your score.',
    },
    {
      question: 'What can I do to maintain my strong cognitive performance?',
      // Written for this implementation; the design has no answer for this question.
      answer:
        'Regular sleep, physical activity, and routines that limit distractions help sustain focus and organization over time.',
    },
    {
      question: 'Can my ADHD trait levels change over time?',
      // Written for this implementation; the design has no answer for this question.
      answer:
        'Yes. Stress, sleep, health, and life circumstances can all affect attention and self-regulation, so your result may differ if you take the test again later.',
    },
    {
      question: 'Is a low score something to be proud of?',
      // Written for this implementation; the design has no answer for this question.
      answer:
        'A low score is neither good nor bad. It simply describes how you currently experience attention, organization, and impulse control.',
    },
  ],
};
