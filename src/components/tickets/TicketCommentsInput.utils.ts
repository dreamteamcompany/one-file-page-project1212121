import func2url from '../../../backend/func2url.json';

export const TEMPLATES_URL = (func2url as Record<string, string>)['api-reply-templates'];
export const IMPROVE_COMMENT_URL = (func2url as Record<string, string>)['api-improve-comment'];

export const MAX_IMG_HEIGHT = 320;

export interface ReplyTemplate {
  id: number;
  title: string;
  content: string;
  is_shared: boolean;
}

/** Конвертирует File в data URL */
export const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result as string);
    reader.onerror = rej;
    reader.readAsDataURL(file);
  });

/** Сериализует contenteditable → plain-text + markdown изображений */
export function serializeEditor(el: HTMLElement): string {
  let result = '';
  el.childNodes.forEach((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      result += node.textContent;
    } else if (node.nodeName === 'BR') {
      result += '\n';
    } else if (node.nodeName === 'IMG') {
      const src = (node as HTMLImageElement).src;
      result += `\n![](${src})\n`;
    } else if (node.nodeName === 'DIV' || node.nodeName === 'P') {
      result += '\n' + serializeEditor(node as HTMLElement);
    } else {
      result += serializeEditor(node as HTMLElement);
    }
  });
  return result;
}
