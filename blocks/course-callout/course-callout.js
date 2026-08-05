/**
 * Decorates the course callout block.
 *
 * Expected rows:
 * 1. Title
 * 2. Body
 * 3. Optional action
 *
 * @param {HTMLElement} block The block element.
 */
export default async function decorate(block) {
  const [titleRow, bodyRow, actionRow] = [...block.children];

  const titleText = titleRow?.textContent.trim();
  const bodyCell = bodyRow?.firstElementChild;
  const actionCell = actionRow?.firstElementChild;

  const callout = document.createElement('aside');
  callout.className = 'course-callout__content';

  if (titleText) {
    const title = document.createElement('h2');
    title.className = 'course-callout__title';
    title.textContent = titleText;
    callout.append(title);
  }

  if (bodyCell?.hasChildNodes()) {
    const body = document.createElement('div');
    body.className = 'course-callout__body';
    body.append(...bodyCell.childNodes);
    callout.append(body);
  }

  if (actionCell?.hasChildNodes()) {
    const actions = document.createElement('div');
    actions.className = 'course-callout__actions';
    actions.append(...actionCell.childNodes);
    callout.append(actions);
  }

  block.replaceChildren(callout);
}
