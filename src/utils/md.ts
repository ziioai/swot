
import markdownit from 'markdown-it';

export const md = markdownit({
  breaks: true,
  linkify: true,
});

export function renderMarkdown(text: string) {
  return md.render(text.trim());
}

export default renderMarkdown;
