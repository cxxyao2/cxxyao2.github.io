# Why Playwright Tests Should Click Native Actionable Elements in Legacy Web Applications

## Background

Recently, I worked on end-to-end automation testing for a legacy JSP web application using Playwright and TypeScript.

The application contains some old-style HTML structures, such as table-based layouts and image links. One simplified example looks like this:

```html
<table id="t123">
  <tr>
    <td>
      <a href="https://somewebsite.com">
        <img id="imageID" src="https://example.com/image.png" />
      </a>
    </td>
  </tr>
</table>
```

In the UI, the user sees an image and clicks it to navigate to another website. At first, I used this Playwright selector:

```ts
await page.locator("table#t123 img#imageID").click();
```

This worked sometimes, but not always. In some Jenkins pipeline runs, especially in the Linux environment, the click did not trigger navigation.

However, when I clicked the parent anchor element instead, the navigation became stable:

```ts
await page.locator("table#t123 a").first().click();
```

A more precise version would be:

```ts
await page.locator("table#t123 a:has(img#imageID)").click();
```

This raised an important question:

> Why is clicking the `<a>` element more reliable than clicking the `<img>` element inside it?

## Why I Clicked the Image First

At the beginning, I did not choose the image selector randomly. The test was written in a Playwright + Cucumber + TypeScript automation framework, and the behavior was described from the business/test scenario perspective.

The Cucumber feature file described the action in a way similar to this:

```gherkin id="r0pyrz"
When I find the cell with the image in the table
And I click the cell
Then the page should navigate to the target website
```

From the feature file point of view, the user sees a table cell containing an image and clicks that visual area. Therefore, the first implementation naturally tried to locate the image inside the table cell and click it:

```ts id="ofc5pa"
await page.locator("table#t123 img#imageID").click();
```

In some implementations, clicking the `<td>` or the `<img>` seemed reasonable because the business wording was “click the cell with the image.” For example:

```ts id="09wejl"
await page.locator("table#t123 td:has(img#imageID)").click();
```

or:

```ts id="jwetz4"
await page.locator("table#t123 img#imageID").click();
```

These selectors may work in some environments because the visible image is inside the link, and the click event may bubble up to the parent `<a>` element.

However, this approach depends on the visual layout and event bubbling behavior rather than targeting the real semantic control. The `<td>` is only a table cell, and the `<img>` is only visual content. Neither of them owns the navigation behavior.

The actual native actionable element is the parent anchor:

```html id="ykb8jh"
<a href="https://somewebsite.com">
  <img id="imageID" src="https://example.com/image.png" />
</a>
```

Therefore, even if the Cucumber step says “click the cell with the image,” the step definition should translate that business action into a semantic web action:

```ts id="2gnq78"
const imageLink = page.locator("table#t123 a:has(img#imageID)");

await imageLink.click();
```

A better step-definition implementation would be:

```ts id="8rvz6z"
When("I click the image link in the table", async function () {
  const imageLink = this.page.locator("table#t123 a:has(img#imageID)");

  await expect(imageLink).toBeVisible();
  await imageLink.click();
});
```

Or, if the Cucumber step still uses the business wording “cell with image,” the implementation can keep the business language but click the semantic parent link:

```ts id="2nwmaf"
When("I click the cell with the image in the table", async function () {
  const imageLink = this.page.locator("table#t123 a:has(img#imageID)");

  await expect(imageLink).toBeVisible();
  await imageLink.click();
});
```

This keeps the feature file readable for business users while making the technical implementation more stable.

The important lesson is:

```text id="hosc8f"
Cucumber describes the user intention.
Playwright should execute that intention against the correct semantic element.
```

So although the feature file says “click the cell” or “click the image,” the automation code should click the `<a href>` element because it is the element that owns the navigation behavior.

## Root Cause

The key point is that `<img>` is not a native actionable element.

The image is only visual content. It does not own the navigation behavior. The navigation behavior belongs to the parent anchor element:

```html
<a href="https://somewebsite.com"></a>
```

In HTML semantics, the `<a href="...">` element is the actual link. The browser understands it as an interactive element that supports focus, click, keyboard activation, context menu, opening in a new tab, and navigation.

The `<img>` element, by contrast, is just an image. It can receive a mouse click as part of the page layout, but it is not itself a semantic link or button.

Therefore, this selector targets the visual child:

```ts
await page.locator("table#t123 img#imageID").click();
```

But this selector targets the real interactive element:

```ts
await page.locator("table#t123 a:has(img#imageID)").click();
```

## Why It May Work on One Environment but Fail on Another

This issue does not mean that DOM event bubbling stops working in Linux Jenkins. Event bubbling still works in modern browsers.

The real problem is that clicking the image depends on several indirect conditions:

```text
The image must be loaded.
The image must have a stable layout.
The click point must hit the image correctly.
No overlay should cover the image.
The click event must bubble to the anchor.
No JavaScript should stop propagation or prevent default behavior.
The browser must treat the user action as a valid activation of the parent link.
```

In a Windows Jenkins pipeline, the image click may happen to work because the layout, rendering, image loading speed, DPI, viewport, or browser behavior allows the click to activate the parent link.

In a Linux Jenkins pipeline, especially in headless mode, small rendering differences may cause the click target to behave differently. The image may not be fully loaded, the computed clickable point may differ, or some legacy JavaScript may handle clicks differently depending on the actual `event.target`.

For example, if legacy JavaScript checks:

```js
if (event.target.tagName === "A") {
  // handle navigation
}
```

then clicking the image produces:

```text
event.target = IMG
```

while clicking the anchor produces:

```text
event.target = A
```

So even though event bubbling still happens, the application logic may not treat the image click the same way as the anchor click.

## Native Actionable Elements

A useful way to understand this is:

> HTML has a group of native actionable elements that browsers already understand as interactive controls.

These elements usually come with built-in support for:

```text
focus
click
keyboard interaction
ARIA role
accessible name
disabled or readonly behavior
form behavior
screen reader semantics
```

According to MDN, only focusable elements can receive keyboard focus, and while `tabindex` can be used to change focus behavior, the best practice is still to use native semantic HTML whenever possible.

Common native actionable or interactive elements include:

| Purpose                         | Recommended Element         |
| ------------------------------- | --------------------------- |
| Run an action                   | `<button>`                  |
| Navigate to another page or URL | `<a href="...">`            |
| Single-line input               | `<input>`                   |
| Multi-line input                | `<textarea>`                |
| Dropdown selection              | `<select>`                  |
| Checkbox                        | `<input type="checkbox">`   |
| Radio button                    | `<input type="radio">`      |
| File upload                     | `<input type="file">`       |
| Expand or collapse content      | `<details>` and `<summary>` |
| Dialog or modal                 | `<dialog>`                  |
| Image map navigation            | `<area href="...">`         |

For example, when the user action is navigation, the correct semantic element is:

```html
<a href="/patients">View patients</a>
```

When the user action is a command, the correct semantic element is:

```html
<button type="button">Add</button>
```

When the user is entering data, native form controls should be used:

```html
<input type="text" />
<select></select>
<textarea></textarea>
```

## Elements That Are Not Native Actionable Elements

The following elements are not interactive by default:

```html
<div>
  <span> <p>li section article header footer main img h1 strong em</p></span>
</div>
```

They do not naturally provide:

```text
Tab focus
keyboard activation
button or link role
disabled behavior
form behavior
screen reader actionable semantics
```

Although it is possible to add attributes such as `role="button"` and `tabindex="0"`, this should usually be a fallback solution, not the first choice.

For example, this is not ideal:

```html
<div role="button" tabindex="0">Add</div>
```

A better solution is:

```html
<button type="button">Add</button>
```

## Playwright Testing Guideline

When writing Playwright tests, the locator should target the actual semantic element that owns the user action.

For navigation, click the link:

```ts
const sceneLink = page.locator("table#t123 a:has(img#imageID)");

await sceneLink.click();
```

If the click causes navigation in the same page:

```ts
await Promise.all([page.waitForURL(/somewebsite\.com/), sceneLink.click()]);
```

If the click opens a new tab or popup:

```ts
const [popup] = await Promise.all([
  page.waitForEvent("popup"),
  sceneLink.click(),
]);

await popup.waitForLoadState();
await expect(popup).toHaveURL(/somewebsite\.com/);
```

If the test only needs to verify the target URL, it may be even more stable to assert the `href` directly:

```ts
await expect(sceneLink).toHaveAttribute("href", /somewebsite\.com/);
```

## Practical Rule

A simple rule is:

```text
If it navigates, click the <a href>.
If it performs an action, click the <button>.
If it receives input, use native form controls.
Do not click visual child elements when a semantic parent element owns the behavior.
```

In this specific case, the stable locator is:

```ts
await page.locator("table#t123 a:has(img#imageID)").click();
```

instead of:

```ts
await page.locator("table#t123 img#imageID").click();
```

## Conclusion

The issue was not caused by Linux Jenkins disabling DOM event bubbling. Event bubbling still works.

The real issue was that the test clicked a visual element, `<img>`, instead of the native actionable element, `<a href="...">`.

In modern web testing and accessibility best practice, tests should interact with the same semantic elements that users and browsers interact with. This makes tests more reliable, more accessible, and less dependent on rendering differences between Windows, Linux, headed mode, and headless mode.

Native actionable elements are valuable because the browser already implements the accessibility and interaction contract for them. When we use non-semantic elements such as `div`, `span`, or `img` as interactive controls, we are effectively reimplementing browser behavior ourselves, which is usually less reliable and more error-prone.
