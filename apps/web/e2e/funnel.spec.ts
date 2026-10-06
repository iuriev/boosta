import { expect, type Page, test } from '@playwright/test';

const PASSWORD = 'correct horse battery';

/** A new account for every run, so the test can be repeated against the same database. */
const newEmail = (label: string) =>
  `e2e-${label}-${String(Date.now())}-${String(Math.floor(Math.random() * 1e6))}@example.com`;

/** Answers the question on screen and moves on. */
async function answer(page: Page, option: string, forward = 'Next question') {
  await page.getByText(option, { exact: true }).click();
  await page.getByRole('button', { name: forward }).click();
}

async function takeQuiz(page: Page, gender: 'Male' | 'Female', options: string[]) {
  await page.getByRole('button', { name: gender, exact: true }).click();
  await expect(page).toHaveURL(/\/quiz$/);
  for (const [index, option] of options.entries()) {
    const isLast = index === options.length - 1;
    await expect(page.getByText(`${String(index + 1)}/${String(options.length)}`)).toBeVisible();
    await answer(page, option, isLast ? 'See my results' : 'Next question');
  }
}

async function fillCredentials(page: Page, email: string) {
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(PASSWORD);
}

test('quiz, account, report, sign out, sign in, retake', async ({ page }) => {
  const email = newEmail('funnel');

  await test.step('an anonymous visitor takes the quiz', async () => {
    await page.goto('/');
    await takeQuiz(page, 'Female', ['Agree', 'Agree', 'Neutral', 'Agree', 'Agree']);
    await expect(page).toHaveURL(/\/signup$/);
  });

  await test.step('creating an account opens the report for those answers', async () => {
    await fillCredentials(page, email);
    await page.getByRole('button', { name: 'Get My Results' }).click();

    await expect(page).toHaveURL(/\/report$/);
    await expect(page.getByRole('figure')).toContainText('70 / 100');
    await expect(page.getByText('High ADHD Traits', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/In women, ADHD can/).first()).toBeVisible();
  });

  await test.step('after signing out the report is closed', async () => {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/signin$/);

    await page.goto('/report');
    await expect(page).toHaveURL(/\/signin$/);
  });

  await test.step('signing in brings the same report back', async () => {
    await fillCredentials(page, email);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/report$/);
    await expect(page.getByRole('figure')).toContainText('70 / 100');
  });

  await test.step('a retake while signed in replaces the report without asking to register', async () => {
    await page.getByRole('link', { name: 'Retake test' }).click();
    await takeQuiz(page, 'Male', Array<string>(5).fill('Disagree'));

    await expect(page).toHaveURL(/\/report$/);
    await expect(page.getByRole('figure')).toContainText('25 / 100');
    await expect(page.getByText('Low ADHD Traits', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/In men, ADHD traits may/).first()).toBeVisible();
  });
});

test('the quiz keeps its place: no skipping, going back, reloading', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Male', exact: true }).click();

  await test.step('the forward control does not skip an unanswered question', async () => {
    // The control is marked inactive but stays operable, so it is pressed from the keyboard.
    await page.getByRole('button', { name: 'Next question' }).press('Enter');

    await expect(page.getByText('Choose an answer to continue.')).toBeVisible();
    await expect(page.getByText('1/5')).toBeVisible();
  });

  await test.step('going back shows the answer that was given', async () => {
    await answer(page, 'Strongly agree');
    await answer(page, 'Neutral');
    await expect(page.getByText('3/5')).toBeVisible();

    await page.getByRole('button', { name: 'Previous question' }).click();

    await expect(page.getByText('2/5')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Neutral' })).toBeChecked();
  });

  await test.step('a reload keeps the question and the answers', async () => {
    await page.reload();

    await expect(page.getByText('2/5')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Neutral' })).toBeChecked();
  });
});

test('an account created before the quiz gets its report right after the quiz', async ({
  page,
}) => {
  await page.goto('/signup');
  await fillCredentials(page, newEmail('account-first'));
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/$/);

  await takeQuiz(page, 'Female', Array<string>(5).fill('Strongly agree'));

  await expect(page).toHaveURL(/\/report$/);
  await expect(page.getByRole('figure')).toContainText('100 / 100');
});

test('pages fit the viewport without horizontal scrolling', async ({ page }) => {
  for (const path of ['/', '/signup', '/signin']) {
    await page.goto(path);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `horizontal overflow on ${path}`).toBe(0);
  }
});
