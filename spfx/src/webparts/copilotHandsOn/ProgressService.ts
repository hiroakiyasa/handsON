import { SPHttpClient, type SPHttpClientResponse } from '@microsoft/sp-http';
import type { WebPartContext } from '@microsoft/sp-webpart-base';

export interface IHandsOnProgress {
  [taskId: string]: boolean;
}

interface IProgressItem {
  Id: number;
  ProgressJson?: string;
}

export class ProgressService {
  private readonly _listTitle: string;
  private _itemId: number | undefined;
  private _userId: number | undefined;

  public constructor(private readonly _context: WebPartContext, listTitle: string) {
    this._listTitle = listTitle || 'CopilotHandsOnProgress';
  }

  public async initialize(): Promise<void> {
    await this._ensureList();
    this._userId = await this._getCurrentUserId();
  }

  public async load(): Promise<IHandsOnProgress> {
    if (!this._userId) throw new Error('SharePointユーザーを確認できませんでした。');
    const url = `${this._listUrl()}/items?$select=Id,ProgressJson&$filter=AuthorId eq ${this._userId}&$top=1`;
    const response = await this._context.spHttpClient.get(url, SPHttpClient.configurations.v1, {
      headers: { Accept: 'application/json;odata=nometadata' }
    });
    await this._throwIfFailed(response, '進捗の読み込み');
    const data = await response.json() as { value: IProgressItem[] };
    const item = data.value[0];
    if (!item) return {};
    this._itemId = item.Id;
    try {
      return item.ProgressJson ? JSON.parse(item.ProgressJson) as IHandsOnProgress : {};
    } catch {
      return {};
    }
  }

  public async save(progress: IHandsOnProgress): Promise<void> {
    const body = JSON.stringify({
      Title: 'GitHub Copilot Hands-on',
      ProgressJson: JSON.stringify(progress)
    });
    if (this._itemId) {
      const response = await this._context.spHttpClient.post(
        `${this._listUrl()}/items(${this._itemId})`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: 'application/json;odata=nometadata',
            'Content-Type': 'application/json;odata=nometadata',
            'IF-MATCH': '*',
            'X-HTTP-Method': 'MERGE'
          },
          body
        }
      );
      await this._throwIfFailed(response, '進捗の更新');
      return;
    }

    const response = await this._context.spHttpClient.post(
      `${this._listUrl()}/items`,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: 'application/json;odata=nometadata',
          'Content-Type': 'application/json;odata=nometadata'
        },
        body
      }
    );
    await this._throwIfFailed(response, '進捗の作成');
    const item = await response.json() as IProgressItem;
    this._itemId = item.Id;
  }

  private async _ensureList(): Promise<void> {
    let response = await this._context.spHttpClient.get(this._listUrl(), SPHttpClient.configurations.v1, {
      headers: { Accept: 'application/json;odata=nometadata' }
    });

    if (response.status === 404) {
      response = await this._context.spHttpClient.post(
        `${this._context.pageContext.web.absoluteUrl}/_api/web/lists`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: 'application/json;odata=nometadata',
            'Content-Type': 'application/json;odata=nometadata'
          },
          body: JSON.stringify({
            BaseTemplate: 100,
            Title: this._listTitle,
            Description: 'GitHub Copilotハンズオンのユーザー別進捗。本人作成項目のみ閲覧・編集。'
          })
        }
      );
      await this._throwIfFailed(response, '進捗リストの作成（初回のみサイト所有者権限が必要です）');

      const fieldResponse = await this._context.spHttpClient.post(
        `${this._listUrl()}/fields`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: 'application/json;odata=nometadata',
            'Content-Type': 'application/json;odata=nometadata'
          },
          body: JSON.stringify({ Title: 'ProgressJson', FieldTypeKind: 3, Required: false })
        }
      );
      await this._throwIfFailed(fieldResponse, '進捗フィールドの作成');

      const securityResponse = await this._context.spHttpClient.post(
        this._listUrl(),
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: 'application/json;odata=nometadata',
            'Content-Type': 'application/json;odata=nometadata',
            'IF-MATCH': '*',
            'X-HTTP-Method': 'MERGE'
          },
          body: JSON.stringify({ ReadSecurity: 2, WriteSecurity: 2 })
        }
      );
      await this._throwIfFailed(securityResponse, '進捗リストの本人限定設定');
      return;
    }

    await this._throwIfFailed(response, '進捗リストの確認');
  }

  private async _getCurrentUserId(): Promise<number> {
    const response = await this._context.spHttpClient.get(
      `${this._context.pageContext.web.absoluteUrl}/_api/web/currentuser?$select=Id`,
      SPHttpClient.configurations.v1,
      { headers: { Accept: 'application/json;odata=nometadata' } }
    );
    await this._throwIfFailed(response, 'ユーザー情報の取得');
    const user = await response.json() as { Id: number };
    return user.Id;
  }

  private _listUrl(): string {
    const escapedTitle = this._listTitle.replace(/'/g, "''");
    return `${this._context.pageContext.web.absoluteUrl}/_api/web/lists/getByTitle('${escapedTitle}')`;
  }

  private async _throwIfFailed(response: SPHttpClientResponse, operation: string): Promise<void> {
    if (response.ok) return;
    const detail = await response.text();
    throw new Error(`${operation}に失敗しました（${response.status}）。${detail}`);
  }
}
