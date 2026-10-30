declare module 'mammoth' {
  export interface MammothResult {
    value: string;
    messages: any[];
  }

  export interface ExtractOptions {
    buffer?: Buffer;
    path?: string;
  }

  export function extractRawText(options: ExtractOptions): Promise<MammothResult>;
  export function convertToHtml(options: ExtractOptions): Promise<MammothResult>;
}
