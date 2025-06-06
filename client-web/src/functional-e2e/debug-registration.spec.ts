import { test, expect } from '@playwright/test';

const baseUrl = 'http://localhost:3000';

test('debug registration page navigation', async ({ page }) => {
  // Navigate to the site
  await page.goto(baseUrl);

  // Take a screenshot of the initial page
  await page.screenshot({ path: 'debug-initial.png', fullPage: true });

  // Click on person icon
  await page.getByTestId('PersonIcon').click();
  await page.screenshot({
    path: 'debug-after-person-icon.png',
    fullPage: true,
  });

  // Click on login menu item
  await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();
  await page.screenshot({ path: 'debug-login-page.png', fullPage: true });

  // Look for any links that might be related to sign up
  console.log('Looking for sign up related links...');
  const links = await page.locator('a').all();
  for (const link of links) {
    const text = await link.textContent();
    if (text && text.toLowerCase().includes('sign')) {
      console.log(`Found link with text: "${text}"`);
    }
  }

  // Look for any buttons that might be related to sign up
  console.log('Looking for sign up related buttons...');
  const buttons = await page.locator('button').all();
  for (const button of buttons) {
    const text = await button.textContent();
    if (text && text.toLowerCase().includes('sign')) {
      console.log(`Found button with text: "${text}"`);
    }
  }

  // Print page content for debugging
  const pageContent = await page.content();
  console.log(
    'Page contains "sign up":',
    pageContent.toLowerCase().includes('sign up')
  );
  console.log(
    'Page contains "register":',
    pageContent.toLowerCase().includes('register')
  );
});

test('debug sign up page elements', async ({ page }) => {
  try {
    // Navigate to the site
    await page.goto(baseUrl);

    // Click on person icon
    await page.getByTestId('PersonIcon').click();

    // Click on login menu item
    await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();

    // Click on sign up link
    await page.getByRole('link', { name: 'Sign up' }).click();

    // Take a screenshot of the sign-up page
    await page.screenshot({ path: 'debug-signup-page.png', fullPage: true });

    // Look for elements with "terms" text
    console.log('Looking for terms text on page...');
    const pageText = await page.textContent('body');
    if (pageText && pageText.toLowerCase().includes('terms')) {
      console.log('Found "terms" text on page');
    }

    // Look for all buttons
    console.log('All buttons on the page:');
    const buttons = await page.locator('button').all();
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      console.log(`Button ${i}: "${text}"`);
    }

    // Look for all checkboxes
    console.log('All checkboxes on the page:');
    const checkboxes = await page.locator('input[type="checkbox"]').all();
    console.log(`Found ${checkboxes.length} checkboxes`);
  } catch (error) {
    console.log('Error in debug test:', error);
    await page.screenshot({ path: 'debug-error.png', fullPage: true });
  }
});

test('debug registration page elements', async ({ page }) => {
  try {
    // Navigate to the site
    await page.goto(baseUrl);

    // Click on person icon
    await page.getByTestId('PersonIcon').click();

    // Click on login menu item
    await page.getByRole('menuitem', { name: 'Log In | Sign Up' }).click();

    // Click on sign up link
    await page.getByRole('link', { name: 'Sign up' }).click();

    // Check the terms checkbox and click Next
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole('button', { name: 'Next' }).click();

    // Wait for page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // Take a screenshot of the registration page
    await page.screenshot({
      path: 'debug-registration-page.png',
      fullPage: true,
    });

    // Get the current URL
    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Get page title
    const pageTitle = await page.title();
    console.log(`Page title: ${pageTitle}`);

    // Check if page content exists
    const bodyText = await page.textContent('body');
    console.log(`Page has content: ${bodyText && bodyText.length > 0}`);
    console.log(`Content length: ${bodyText?.length || 0}`);

    // Look for all elements
    const allElements = await page.locator('*').count();
    console.log(`Total elements on page: ${allElements}`);

    // Look for all headings
    console.log('All headings on the registration page:');
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    for (let i = 0; i < headings.length; i++) {
      const text = await headings[i].textContent();
      const tagName = await headings[i].evaluate(el => el.tagName);
      console.log(`${tagName}: "${text}"`);
    }

    // Look for input fields
    console.log('All input fields on the registration page:');
    const inputs = await page.locator('input').all();
    for (let i = 0; i < inputs.length; i++) {
      const type = await inputs[i].getAttribute('type');
      const placeholder = await inputs[i].getAttribute('placeholder');
      const ariaLabel = await inputs[i].getAttribute('aria-label');
      console.log(
        `Input ${i}: type="${type}", placeholder="${placeholder}", aria-label="${ariaLabel}"`
      );
    }

    // Look for all buttons
    console.log('All buttons on the registration page:');
    const buttons = await page.locator('button').all();
    for (let i = 0; i < buttons.length; i++) {
      const text = await buttons[i].textContent();
      console.log(`Button ${i}: "${text}"`);
    }
  } catch (error) {
    console.log('Error in debug test:', error);
    await page.screenshot({
      path: 'debug-registration-error.png',
      fullPage: true,
    });
  }
});
