import { SPHttpClient } from '@microsoft/sp-http';
import type { WebPartContext } from '@microsoft/sp-webpart-base';

interface ISharePointFileResponse {
  UniqueId?: string;
}

/**
 * SharePoint共有リンクから、同一テナント内で利用できるStream埋め込みURLを生成します。
 * Microsoft Graph APIは使用しません。
 */
export class SharePointVideoService {
  public constructor(private readonly _context: WebPartContext) {}

  public async getEmbedUrl(sharedUrl: string): Promise<string> {
    if (sharedUrl.toLowerCase().includes('/_layouts/15/embed.aspx')) {
      return sharedUrl;
    }

    const parsed = new URL(sharedUrl);
    if (!parsed.hostname.toLowerCase().endsWith('.sharepoint.com')) {
      throw new Error('SharePointの動画URLではありません。');
    }

    const serverRelativePath = this._getServerRelativePath(parsed.pathname);
    const siteRoot = this._getSiteRoot(serverRelativePath);
    const escapedPath = encodeURIComponent(serverRelativePath.replace(/'/g, "''"));
    const endpoint =
      `${parsed.origin}${siteRoot}/_api/web/GetFileByServerRelativePath(decodedurl='${escapedPath}')?$select=UniqueId`;

    const response = await this._context.spHttpClient.get(
      endpoint,
      SPHttpClient.configurations.v1,
      { headers: { Accept: 'application/json;odata=nometadata' } }
    );

    if (!response.ok) {
      throw new Error(`動画情報を取得できませんでした（${response.status}）。`);
    }

    const file = await response.json() as ISharePointFileResponse;
    if (!file.UniqueId) {
      throw new Error('動画のUniqueIdを取得できませんでした。');
    }

    return `${parsed.origin}${siteRoot}/_layouts/15/embed.aspx?UniqueId=${encodeURIComponent(file.UniqueId)}`;
  }

  private _getServerRelativePath(pathname: string): string {
    const decoded = decodeURIComponent(pathname);
    const directPath = decoded.replace(/^\/:v:\/r/i, '');
    if (!/^\/(sites|teams)\//i.test(directPath) || !/\.mp4$/i.test(directPath)) {
      throw new Error('SharePoint MP4共有リンクの形式を確認してください。');
    }
    return directPath;
  }

  private _getSiteRoot(serverRelativePath: string): string {
    const match = serverRelativePath.match(/^\/(sites|teams)\/[^/]+/i);
    if (!match) throw new Error('SharePointサイトのパスを確認できませんでした。');
    return match[0];
  }
}
